package com.gastroguide.medicalrecord;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gastroguide.common.RateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Cobre isolamento entre médicos e validação de config — exigido pelo
 * documentação interna ("motor de formulário por doença" é um dos três fluxos com
 * teste de integração obrigatório). Mesma limitação de Testcontainers
 * nesta máquina de dev que os outros testes de integração do projeto —
 * validar também via curl/browser.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class MedicalRecordIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RateLimiter rateLimiter;

    @BeforeEach
    void resetRateLimiter() {
        // Os cenários cadastram vários médicos do mesmo IP; sem isso o limite
        // de cadastro (10/hora) devolve 429 no meio da suíte.
        rateLimiter.clear();
    }

    private String uniqueEmail() {
        return "medico" + System.nanoTime() + "@teste.com";
    }

    private String signupAndGetAccessToken(String crm) throws Exception {
        String json = """
                {"name":"Dra. Teste","email":"%s","password":"senha12345","crm":"%s","crmUf":"SP"}
                """.formatted(uniqueEmail(), crm);

        String response = mockMvc.perform(post("/api/auth/cadastro")
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    private String crmIdFor(String accessToken) throws Exception {
        String response = mockMvc.perform(get("/api/medicos/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("crms").get(0).get("id").asText();
    }

    private String createPatient(String accessToken, String name) throws Exception {
        String json = """
                {"name":"%s"}
                """.formatted(name);
        String response = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    @Test
    void salvaERecuperaCabecalhoDeDoenca() throws Exception {
        String token = signupAndGetAccessToken("20001");
        String patientId = createPatient(token, "Paciente DRGE");

        String json = """
                {"data":{"fenotipo":["DRGE erosiva"],"praga":"C2M5"}}
                """;

        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fenotipo[0]").value("DRGE erosiva"));

        mockMvc.perform(get("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.praga").value("C2M5"));
    }

    @Test
    void rejeitaCampoDesconhecidoNoCabecalho() throws Exception {
        String token = signupAndGetAccessToken("20002");
        String patientId = createPatient(token, "Paciente DRGE 2");

        String json = """
                {"data":{"campoFake":"x"}}
                """;

        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void camposEmBrancoOuVaziosSaoIgnoradosEmVezDeRejeitadosOuPersistidos() throws Exception {
        String token = signupAndGetAccessToken("20014");
        String patientId = createPatient(token, "Paciente DII 2");

        // diagnostico preenchido; dcComportamento (SINGLE) chega como "" e
        // dcLocalizacao (MULTI) chega como [] — como um formulário manda todo
        // o mapa de campos, não só os preenchidos. Nenhum dos dois deve ser
        // rejeitado com 400 nem persistido como ruído vazio no JSONB.
        String json = """
                {"data":{"diagnostico":["Doença de Crohn"],"dcComportamento":"","dcLocalizacao":[]}}
                """;

        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/dii")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diagnostico[0]").value("Doença de Crohn"))
                .andExpect(jsonPath("$.data.dcComportamento").doesNotExist())
                .andExpect(jsonPath("$.data.dcLocalizacao").doesNotExist());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/cabecalhos/dii")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diagnostico[0]").value("Doença de Crohn"))
                .andExpect(jsonPath("$.data.dcComportamento").doesNotExist())
                .andExpect(jsonPath("$.data.dcLocalizacao").doesNotExist());
    }

    @Test
    void cabecalhoAindaNaoPreenchidoRetorna404() throws Exception {
        String token = signupAndGetAccessToken("20003");
        String patientId = createPatient(token, "Paciente DII");

        mockMvc.perform(get("/api/pacientes/" + patientId + "/cabecalhos/dii")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void medicoNaoAcessaCabecalhoDePacienteDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("20004");
        String tokenB = signupAndGetAccessToken("20005");
        String patientId = createPatient(tokenA, "Paciente Da Dra A");

        String json = """
                {"data":{"fenotipo":["DRGE erosiva"]}}
                """;
        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void criaRegistroComSnapshotDoCabecalhoNoMomento() throws Exception {
        String token = signupAndGetAccessToken("20006");
        String patientId = createPatient(token, "Paciente Snapshot");

        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"data":{"fenotipo":["DRGE erosiva"]}}
                                """))
                .andExpect(status().isOk());

        String createJson = """
                {"type":"PRIMEIRA_CONSULTA","disease":"drge","title":"1a consulta DRGE","contentText":"Paciente relata pirose.","crmId":"%s"}
                """.formatted(crmIdFor(token));
        String response = mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentJson.fenotipo[0]").value("DRGE erosiva"))
                .andReturn().getResponse().getContentAsString();
        String recordId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"data":{"fenotipo":["Esôfago de Barrett"]}}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario/" + recordId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentJson.fenotipo[0]").value("DRGE erosiva"));
    }

    /** Os cards do "Histórico de consultas" vêm com o resumo do dia, sem abrir cada registro. */
    @Test
    void historicoTrazResumoDaConsulta() throws Exception {
        String token = signupAndGetAccessToken("20022");
        String patientId = createPatient(token, "Paciente Resumo");
        String crmId = crmIdFor(token);

        mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","disease":"drge","title":"DRGE — Consulta","crmId":"%s",
                                 "consultationData":{"hipotese":"DRGE erosiva","conduta":"IBP 8 semanas"},
                                 "scores":["FIB-4: 1,10 (baixo risco)"]}
                                """.formatted(crmId)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"RETORNO","title":"Geral — Retorno","crmId":"%s",
                                 "consultationData":{"queixa":"Melhora da pirose"}}
                                """.formatted(crmId)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].excerpt").value("Melhora da pirose"))
                .andExpect(jsonPath("$[0].hypothesis").doesNotExist())
                .andExpect(jsonPath("$[1].diseaseName").value("DRGE"))
                .andExpect(jsonPath("$[1].hypothesis").value("DRGE erosiva"))
                .andExpect(jsonPath("$[1].conduct").value("IBP 8 semanas"))
                .andExpect(jsonPath("$[1].excerpt").doesNotExist())
                .andExpect(jsonPath("$[1].scoreCount").value(1))
                .andExpect(jsonPath("$[1].crm").exists());
    }

    @Test
    void listaHistoricoCronologicoOrdenadoDoMaisRecente() throws Exception {
        String token = signupAndGetAccessToken("20007");
        String patientId = createPatient(token, "Paciente Historico");
        String crmId = crmIdFor(token);

        mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","title":"Primeira","contentText":"...","crmId":"%s"}
                                """.formatted(crmId)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"RETORNO","title":"Retorno","contentText":"...","crmId":"%s"}
                                """.formatted(crmId)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Retorno"))
                .andExpect(jsonPath("$[1].title").value("Primeira"));
    }

    @Test
    void medicoNaoAcessaProntuarioDePacienteDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("20008");
        String tokenB = signupAndGetAccessToken("20009");
        String patientId = createPatient(tokenA, "Paciente Prontuario A");

        String response = mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("""
                                {"type":"EVOLUCAO","title":"Nota","contentText":"...","crmId":"%s"}
                                """.formatted(crmIdFor(tokenA))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String recordId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario/" + recordId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/pacientes/" + patientId + "/prontuario/" + recordId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeRegistroComSucesso() throws Exception {
        String token = signupAndGetAccessToken("20010");
        String patientId = createPatient(token, "Paciente Remove");

        String response = mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"EVOLUCAO","title":"Nota a remover","contentText":"...","crmId":"%s"}
                                """.formatted(crmIdFor(token))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String recordId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(delete("/api/pacientes/" + patientId + "/prontuario/" + recordId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario/" + recordId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void registroGuardaSnapshotDoCrmEscolhidoNaCriacao() throws Exception {
        String token = signupAndGetAccessToken("20011");
        String patientId = createPatient(token, "Paciente CRM Snapshot");
        String crmId = crmIdFor(token);

        String createJson = """
                {"type":"PRIMEIRA_CONSULTA","title":"Consulta","crmId":"%s"}
                """.formatted(crmId);

        mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.crm").value("20011"))
                .andExpect(jsonPath("$.crmUf").value("SP"))
                .andExpect(jsonPath("$.rqe").doesNotExist());
    }

    @Test
    void rejeitaCrmIdDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("20012");
        String patientIdA = createPatient(tokenA, "Paciente Medico A");

        String tokenB = signupAndGetAccessToken("20013");
        String crmIdB = crmIdFor(tokenB);

        String createJson = """
                {"type":"PRIMEIRA_CONSULTA","title":"Consulta","crmId":"%s"}
                """.formatted(crmIdB);

        mockMvc.perform(post("/api/pacientes/" + patientIdA + "/prontuario")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rascunhoAutomaticoSalvaRecuperaEDescartaIsoladoPorMedico() throws Exception {
        String token = signupAndGetAccessToken("20020");
        String patientId = createPatient(token, "Paciente Rascunho");
        String url = "/api/pacientes/" + patientId + "/prontuario/rascunhos/drge";

        // Sem rascunho ainda: 204, não erro.
        mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(put(url).header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","values":{"hma":"Pirose há 6 meses"},"scores":[]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.formKey").value("drge"))
                .andExpect(jsonPath("$.updatedAt").exists());

        // Salvar de novo substitui (um rascunho por paciente + modelo).
        mockMvc.perform(put(url).header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","values":{"hma":"Pirose há 7 meses"}}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.values.hma").value("Pirose há 7 meses"));

        // Outro modelo do mesmo paciente é outro rascunho.
        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario/rascunhos/geral")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Chave de modelo fora do padrão.
        mockMvc.perform(put("/api/pacientes/" + patientId + "/prontuario/rascunhos/DRGE_x")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());

        // Outro médico não alcança o rascunho nem escreve nele.
        String otherToken = signupAndGetAccessToken("20021");
        mockMvc.perform(get(url).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(put(url).header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content("{\"values\":{}}"))
                .andExpect(status().isNotFound());

        // Secretária não vê rascunho de prontuário (dado clínico).
        String secretaryEmail = "secretaria-rascunho" + System.nanoTime() + "@teste.com";
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"name":"Secretaria","email":"%s","password":"senha12345"}
                                """.formatted(secretaryEmail)))
                .andExpect(status().isOk());
        String secretaryLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"senha12345"}
                                """.formatted(secretaryEmail)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secretaryToken = objectMapper.readTree(secretaryLogin).get("accessToken").asText();
        mockMvc.perform(get(url).header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }
}
