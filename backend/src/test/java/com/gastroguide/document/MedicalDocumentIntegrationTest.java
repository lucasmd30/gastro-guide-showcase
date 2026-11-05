package com.gastroguide.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gastroguide.common.RateLimiter;
import com.gastroguide.document.signature.SignedPdfFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Documentos médicos (14/10/2026): emissão com CRM congelado, documento
 * definitivo (sem edição nem exclusão), isolamento entre médicos, secretária
 * barrada, e os modelos próprios isolados por médico. CRMs 50001–50009.
 * PDF assinado anexado (19/10/2026): CRMs 50010–50011.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class MedicalDocumentIntegrationTest {

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
        rateLimiter.clear();
    }

    private String signupAndGetAccessToken(String crm) throws Exception {
        String json = """
                {"name":"Dra. Teste","email":"medico%d@teste.com","password":"senha12345","crm":"%s","crmUf":"SP"}
                """.formatted(System.nanoTime(), crm);
        String response = mockMvc.perform(post("/api/auth/cadastro").contentType("application/json").content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    private String crmIdFor(String token) throws Exception {
        String response = mockMvc.perform(get("/api/medicos/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("crms").get(0).get("id").asText();
    }

    private String createPatient(String token, String name) throws Exception {
        String response = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"%s\"}".formatted(name)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String issueAtestado(String token, String patientId, String crmId) throws Exception {
        String json = """
                {"kind":"ATESTADO","model":"atestado_afastamento","title":"Atestado médico (afastamento)",
                 "content":"Atesto, para os devidos fins, que Fulano necessita de 3 dias de afastamento.",
                 "data":{"dias":"3","cid":"K21.0 — Doença de refluxo","vazio":"  "},"crmId":"%s"}
                """.formatted(crmId);
        String response = mockMvc.perform(post("/api/pacientes/" + patientId + "/documentos")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String createSecretaryAndGetToken(String doctorToken) throws Exception {
        String email = "secretaria" + System.nanoTime() + "@teste.com";
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Secretaria\",\"email\":\"%s\",\"password\":\"senha12345\"}".formatted(email)))
                .andExpect(status().isOk());
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"%s\",\"password\":\"senha12345\"}".formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    @Test
    void emiteListaELeDocumentoComCrmCongelado() throws Exception {
        String token = signupAndGetAccessToken("50001");
        String patientId = createPatient(token, "Paciente Atestado");
        String documentId = issueAtestado(token, patientId, crmIdFor(token));

        mockMvc.perform(get("/api/pacientes/" + patientId + "/documentos/" + documentId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("ATESTADO"))
                .andExpect(jsonPath("$.crm").value("50001"))
                .andExpect(jsonPath("$.crmUf").value("SP"))
                .andExpect(jsonPath("$.data.dias").value("3"))
                // Campo em branco do formulário não é gravado.
                .andExpect(jsonPath("$.data.vazio").doesNotExist())
                .andExpect(jsonPath("$.issuedAt").exists());

        mockMvc.perform(get("/api/pacientes/" + patientId + "/documentos").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Atestado médico (afastamento)"));
    }

    /** Definitivo: não há rota de edição nem de exclusão, e o documento continua lá. */
    /**
     * Assinatura digital (19/10/2026): o PDF assinado no assinador do médico é
     * conferido e guardado ao lado do documento, que não muda. PDF sem
     * assinatura ou de outro documento é recusado; outro médico não alcança.
     */
    @Test
    void anexaPdfAssinadoConferidoAoDocumento() throws Exception {
        String token = signupAndGetAccessToken("50010");
        String otherToken = signupAndGetAccessToken("50011");
        String patientId = createPatient(token, "Paciente Assinatura");
        String documentId = issueAtestado(token, patientId, crmIdFor(token));
        String path = "/api/pacientes/" + patientId + "/documentos/" + documentId;

        String code = objectMapper.readTree(mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.signed").value(false))
                .andReturn().getResponse().getContentAsString()).get("verificationCode").asText();
        String printed = code.substring(0, 4) + "-" + code.substring(4);

        byte[] unsigned = SignedPdfFixtures.pdf("Atestado. Codigo de verificacao: " + printed);
        mockMvc.perform(multipart(path + "/assinatura").file(new MockMultipartFile("file", "a.pdf", "application/pdf", unsigned))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
        byte[] otherDocument = SignedPdfFixtures.signed(SignedPdfFixtures.pdf("Codigo 0000-0000"),
                "CN=DRA TESTE:12345678909, O=ICP-Brasil, C=BR");
        mockMvc.perform(multipart(path + "/assinatura").file(new MockMultipartFile("file", "b.pdf", "application/pdf", otherDocument))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        byte[] signed = SignedPdfFixtures.signed(unsigned, "CN=DRA TESTE:12345678909, O=ICP-Brasil, C=BR");
        MockMultipartFile file = new MockMultipartFile("file", "atestado-assinado.pdf", "application/pdf", signed);
        mockMvc.perform(multipart(path + "/assinatura").file(file).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(multipart(path + "/assinatura").file(file).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signed").value(true))
                .andExpect(jsonPath("$.signature.signerName").value("DRA TESTE"))
                .andExpect(jsonPath("$.signature.signerCpf").value("12345678909"))
                .andExpect(jsonPath("$.signature.level").value("ICP_BRASIL"))
                .andExpect(jsonPath("$.content").value(
                        "Atesto, para os devidos fins, que Fulano necessita de 3 dias de afastamento."));

        mockMvc.perform(get("/api/pacientes/" + patientId + "/documentos").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].signed").value(true));
        mockMvc.perform(get(path + "/assinatura/pdf").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(content().bytes(signed));
        mockMvc.perform(get(path + "/assinatura/pdf").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void documentoEmitidoNaoPodeSerAlteradoNemExcluido() throws Exception {
        String token = signupAndGetAccessToken("50002");
        String patientId = createPatient(token, "Paciente Definitivo");
        String documentId = issueAtestado(token, patientId, crmIdFor(token));
        String path = "/api/pacientes/" + patientId + "/documentos/" + documentId;

        mockMvc.perform(delete(path).header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put(path).header("Authorization", "Bearer " + token)
                        .contentType("application/json").content("{\"title\":\"x\"}"))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Atestado médico (afastamento)"));
    }

    @Test
    void medicoNaoVeNemEmiteDocumentoDePacienteDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("50003");
        String tokenB = signupAndGetAccessToken("50004");
        String patientA = createPatient(tokenA, "Paciente do A");
        String documentId = issueAtestado(tokenA, patientA, crmIdFor(tokenA));

        mockMvc.perform(get("/api/pacientes/" + patientA + "/documentos").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/pacientes/" + patientA + "/documentos/" + documentId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/pacientes/" + patientA + "/documentos")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("""
                                {"kind":"OUTRO","title":"x","content":"x","crmId":"%s"}
                                """.formatted(crmIdFor(tokenB))))
                .andExpect(status().isNotFound());
    }

    /** O CRM precisa ser do próprio médico — senão o documento sairia assinado com o registro de outro. */
    @Test
    void recusaCrmDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("50005");
        String tokenB = signupAndGetAccessToken("50006");
        String patientA = createPatient(tokenA, "Paciente CRM");

        mockMvc.perform(post("/api/pacientes/" + patientA + "/documentos")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("""
                                {"kind":"OUTRO","title":"x","content":"x","crmId":"%s"}
                                """.formatted(crmIdFor(tokenB))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void secretariaNaoAcessaDocumentosNemModelos() throws Exception {
        String doctorToken = signupAndGetAccessToken("50007");
        String patientId = createPatient(doctorToken, "Paciente Secretaria");
        issueAtestado(doctorToken, patientId, crmIdFor(doctorToken));
        String secretaryToken = createSecretaryAndGetToken(doctorToken);

        mockMvc.perform(get("/api/pacientes/" + patientId + "/documentos")
                        .header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/pacientes/" + patientId + "/documentos")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("{\"kind\":\"OUTRO\",\"title\":\"x\",\"content\":\"x\",\"crmId\":\"%s\"}"
                                .formatted(java.util.UUID.randomUUID())))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/medicos/me/modelos-documento")
                        .header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void modelosPropriosSaoDoMedicoECrudFunciona() throws Exception {
        String tokenA = signupAndGetAccessToken("50008");
        String tokenB = signupAndGetAccessToken("50009");

        String response = mockMvc.perform(post("/api/medicos/me/modelos-documento")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"kind\":\"ORIENTACAO\",\"name\":\"Pós-colonoscopia\",\"content\":\"Dieta leve.\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String templateId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(put("/api/medicos/me/modelos-documento/" + templateId)
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"kind\":\"ORIENTACAO\",\"name\":\"Pós-colonoscopia\",\"content\":\"Dieta leve por 24 h.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Dieta leve por 24 h."));

        // O outro médico não vê, não edita e não apaga.
        mockMvc.perform(get("/api/medicos/me/modelos-documento").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(put("/api/medicos/me/modelos-documento/" + templateId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"kind\":\"ORIENTACAO\",\"name\":\"x\",\"content\":\"x\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/medicos/me/modelos-documento/" + templateId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/medicos/me/modelos-documento/" + templateId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/medicos/me/modelos-documento").header("Authorization", "Bearer " + tokenA))
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
