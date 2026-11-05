package com.gastroguide.secretary;

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
 * Isolamento por papel (Secretária) — extensão do caso "isolamento entre
 * médicos" já coberto por outros testes deste projeto. Mesma limitação de
 * Testcontainers desta máquina de dev Windows; validar via curl como
 * documentado na documentação interna.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class SecretaryIntegrationTest {

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

    private String signupDoctorAndGetToken(String crm) throws Exception {
        String json = """
                {"name":"Dra. Teste","email":"medico%s@teste.com","password":"senha12345","crm":"%s","crmUf":"SP"}
                """.formatted(System.nanoTime(), crm);
        String response = mockMvc.perform(post("/api/auth/cadastro")
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    private String createSecretaryAndGetToken(String doctorToken) throws Exception {
        String email = "secretaria" + System.nanoTime() + "@teste.com";
        String createJson = """
                {"name":"Secretaria Teste","email":"%s","password":"senha12345"}
                """.formatted(email);
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk());

        String loginJson = """
                {"email":"%s","password":"senha12345"}
                """.formatted(email);
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SECRETARIA"))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(loginResponse).get("accessToken").asText();
    }

    @Test
    void secretariaAcessaPacientesMasNaoDoencasOuCabecalhos() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30001");
        String secretaryToken = createSecretaryAndGetToken(doctorToken);

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/doencas").header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/medicos/me").header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void secretariaVePacientesDoMesmoMedicoQueACriou() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30002");

        String patientJson = """
                {"name":"Paciente da secretaria"}
                """;
        mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content(patientJson))
                .andExpect(status().isOk());

        String secretaryToken = createSecretaryAndGetToken(doctorToken);

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Paciente da secretaria"));
    }

    @Test
    void secretariaNaoAcessaCabecalhoDeDoencaDoPaciente() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30003");

        String patientJson = """
                {"name":"Paciente com prontuario"}
                """;
        String patientResponse = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content(patientJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String patientId = objectMapper.readTree(patientResponse).get("id").asText();

        String secretaryToken = createSecretaryAndGetToken(doctorToken);

        mockMvc.perform(get("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void secretariaNaoConsegueEscreverDadoClinicoNemGerenciarSecretariasNemExcluirPaciente() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30006");

        String patientJson = """
                {"name":"Paciente escrita bloqueada"}
                """;
        String patientResponse = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content(patientJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String patientId = objectMapper.readTree(patientResponse).get("id").asText();

        String secretaryToken = createSecretaryAndGetToken(doctorToken);

        // Escrever cabeçalho de doença — bloqueado.
        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/drge")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("""
                                {"data":{"fenotipo":"DRGE erosiva"}}
                                """))
                .andExpect(status().isForbidden());

        // Criar registro de prontuário — bloqueado.
        mockMvc.perform(post("/api/pacientes/" + patientId + "/prontuario")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("""
                                {"type":"EVOLUCAO","title":"Nota"}
                                """))
                .andExpect(status().isForbidden());

        // Tentativa de escalação de privilégio: criar outra secretária.
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("""
                                {"name":"Outra","email":"outra@teste.com","password":"senha12345"}
                                """))
                .andExpect(status().isForbidden());

        // Excluir o paciente apagaria o prontuário inteiro em cascata — bloqueado.
        mockMvc.perform(delete("/api/pacientes/" + patientId)
                        .header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void secretariaNaoAcessaPacienteDeOutroMedico() throws Exception {
        String doctorATokenForPatient = signupDoctorAndGetToken("30007");
        String patientJson = """
                {"name":"Paciente do medico A"}
                """;
        String patientResponse = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + doctorATokenForPatient)
                        .contentType("application/json")
                        .content(patientJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String patientId = objectMapper.readTree(patientResponse).get("id").asText();

        String doctorBToken = signupDoctorAndGetToken("30008");
        String secretaryOfBToken = createSecretaryAndGetToken(doctorBToken);

        mockMvc.perform(get("/api/pacientes/" + patientId)
                        .header("Authorization", "Bearer " + secretaryOfBToken))
                .andExpect(status().isNotFound());
    }

    /**
     * Os convênios do perfil chegam à agenda para a secretária escolher o
     * plano — só leitura, e só os do médico dela.
     */
    @Test
    void secretariaLeConveniosDoMedicoPelaAgendaMasNaoAltera() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30055");
        mockMvc.perform(post("/api/medicos/me/convenios")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Unimed\"}"))
                .andExpect(status().isOk());
        String secretaryToken = createSecretaryAndGetToken(doctorToken);

        mockMvc.perform(get("/api/agenda/convenios").header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]").value("Unimed"));
        mockMvc.perform(post("/api/medicos/me/convenios")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Amil\"}"))
                .andExpect(status().isForbidden());

        String otherDoctorToken = signupDoctorAndGetToken("30056");
        mockMvc.perform(get("/api/agenda/convenios").header("Authorization", "Bearer " + otherDoctorToken))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void loginDeMedicoContinuaFuncionandoNormalmente() throws Exception {
        String token = signupDoctorAndGetToken("30004");

        mockMvc.perform(get("/api/doencas").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/medicos/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").exists());
    }

    @Test
    void medicoRedefineSenhaDaSecretariaEAsSessoesDelaCaem() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30040");
        String email = "secretariasenha" + System.nanoTime() + "@teste.com";
        String secretaryId = objectMapper.readTree(mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content("""
                                {"name":"Secretaria Senha","email":"%s","password":"senha12345"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("id").asText();

        String login = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"senha12345"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secretaryToken = objectMapper.readTree(login).get("accessToken").asText();
        String refreshToken = objectMapper.readTree(login).get("refreshToken").asText();

        // Senha curta demais: mesma regra do cadastro.
        mockMvc.perform(put("/api/medicos/me/secretarias/" + secretaryId + "/senha")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content("{\"password\":\"curta\"}"))
                .andExpect(status().isBadRequest());

        // A própria secretária não troca a senha por esta rota (é gestão do médico).
        mockMvc.perform(put("/api/medicos/me/secretarias/" + secretaryId + "/senha")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("{\"password\":\"outrasenha123\"}"))
                .andExpect(status().isForbidden());

        // Outro médico não alcança a secretária.
        String otherDoctorToken = signupDoctorAndGetToken("30041");
        mockMvc.perform(put("/api/medicos/me/secretarias/" + secretaryId + "/senha")
                        .header("Authorization", "Bearer " + otherDoctorToken)
                        .contentType("application/json")
                        .content("{\"password\":\"outrasenha123\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/medicos/me/secretarias/" + secretaryId + "/senha")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content("{\"password\":\"novasenha123\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"senha12345"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized());
        String newLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"novasenha123"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SECRETARIA"))
                .andReturn().getResponse().getContentAsString();
        String newRefreshToken = objectMapper.readTree(newLogin).get("refreshToken").asText();

        // A sessão aberta com a senha antiga não renova mais...
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("{\"refreshToken\":\"%s\"}".formatted(refreshToken)))
                .andExpect(status().isUnauthorized());

        // ...e a tentativa não é tratada como roubo: a sessão nova continua valendo.
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("{\"refreshToken\":\"%s\"}".formatted(newRefreshToken)))
                .andExpect(status().isOk());
    }

    @Test
    void refreshTokenDeSecretariaFuncionaERotaciona() throws Exception {
        String doctorToken = signupDoctorAndGetToken("30005");
        String email = "secretariarefresh" + System.nanoTime() + "@teste.com";
        String createJson = """
                {"name":"Secretaria Refresh","email":"%s","password":"senha12345"}
                """.formatted(email);
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk());

        String loginJson = """
                {"email":"%s","password":"senha12345"}
                """.formatted(email);
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String refreshToken = objectMapper.readTree(loginResponse).get("refreshToken").asText();

        String refreshJson = """
                {"refreshToken":"%s"}
                """.formatted(refreshToken);
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content(refreshJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SECRETARIA"));

        // Reuso do token já rotacionado deve ser rejeitado (detecção de reuso).
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content(refreshJson))
                .andExpect(status().isUnauthorized());
    }
}
