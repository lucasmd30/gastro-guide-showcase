package com.gastroguide.patient;

import com.fasterxml.jackson.databind.JsonNode;
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
 * Cobre só o que a documentação interna exige como obrigatório para essa entidade:
 * isolamento entre médicos e a validação de CPF (dígito verificador). Não
 * roda nesta máquina de dev pelo mesmo motivo do AuthIntegrationTest —
 * ver "Nota sobre testes de integração" na documentação interna.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class PatientIntegrationTest {

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

    private JsonNode createPatient(String accessToken, String name, String cpf) throws Exception {
        String json = """
                {"name":"%s","cpf":"%s"}
                """.formatted(name, cpf);

        String response = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void listaExigeAutenticacao() throws Exception {
        mockMvc.perform(get("/api/pacientes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cpfInvalidoRetorna400() throws Exception {
        String token = signupAndGetAccessToken("10001");

        String json = """
                {"name":"Paciente Teste","cpf":"11111111111"}
                """;

        mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cpfDuplicadoParaMesmoMedicoRetorna409() throws Exception {
        String token = signupAndGetAccessToken("10002");

        createPatient(token, "Paciente Um", "52998224725");

        String json = """
                {"name":"Paciente Dois","cpf":"529.982.247-25"}
                """;

        mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isConflict());
    }

    @Test
    void listaPaginaEBuscaNoServidor() throws Exception {
        String token = signupAndGetAccessToken("10005");

        createPatient(token, "Ana Beatriz Souza", "52998224725");
        createPatient(token, "Bruno Carvalho Lima", "");
        createPatient(token, "Carla Dias Moreira", "");

        // Paginação: 2 por página, 3 pacientes, ordenados por nome.
        mockMvc.perform(get("/api/pacientes?page=0&size=2").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].name").value("Ana Beatriz Souza"));

        mockMvc.perform(get("/api/pacientes?page=1&size=2").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Carla Dias Moreira"));

        // Busca por nome, sem diferenciar maiúsculas.
        mockMvc.perform(get("/api/pacientes?q=bruno").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Bruno Carvalho Lima"));

        // Busca por CPF pontuado casa com o CPF só de dígitos gravado no banco.
        mockMvc.perform(get("/api/pacientes?q=529.982").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Ana Beatriz Souza"));

        mockMvc.perform(get("/api/pacientes?q=inexistente").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    /** "Silverio" acha "Silvério" — e o contrário também (pedido de 09/10/2026). */
    @Test
    void buscaIgnoraAcentos() throws Exception {
        String token = signupAndGetAccessToken("10008");
        createPatient(token, "Silvério Araújo", "");
        createPatient(token, "Joao Conceicao", "");

        for (String q : new String[] { "silverio", "SILVÉRIO", "araujo", "Araúj" }) {
            mockMvc.perform(get("/api/pacientes").param("q", q).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(1))
                    .andExpect(jsonPath("$.items[0].name").value("Silvério Araújo"));
        }
        // Acento na busca, nome gravado sem acento.
        mockMvc.perform(get("/api/pacientes").param("q", "joão conceição").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Joao Conceicao"));
    }

    @Test
    void buscaNaoVazaPacienteDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("10006");
        String tokenB = signupAndGetAccessToken("10007");

        createPatient(tokenA, "Paciente Exclusivo Da Dra A", "");

        // Mesmo com o termo exato, a busca do médico B não encontra nada.
        mockMvc.perform(get("/api/pacientes?q=Exclusivo").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(get("/api/pacientes?q=Exclusivo").header("Authorization", "Bearer " + tokenA))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void medicoNaoVeNemAlteraPacienteDeOutroMedico() throws Exception {
        String tokenA = signupAndGetAccessToken("10003");
        String tokenB = signupAndGetAccessToken("10004");

        JsonNode patient = createPatient(tokenA, "Paciente Da Dra A", "");
        String patientId = patient.get("id").asText();

        // Médico B não vê o paciente na lista.
        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.hasItem(
                                org.hamcrest.Matchers.hasEntry("id", patientId)))));

        // Médico B não consegue buscar, atualizar nem remover o paciente da médica A.
        mockMvc.perform(get("/api/pacientes/" + patientId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        String updateJson = """
                {"name":"Nome Alterado"}
                """;
        mockMvc.perform(put("/api/pacientes/" + patientId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content(updateJson))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/pacientes/" + patientId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Mas o médico A continua enxergando o próprio paciente normalmente.
        mockMvc.perform(get("/api/pacientes/" + patientId).header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Paciente Da Dra A"));
    }
}
