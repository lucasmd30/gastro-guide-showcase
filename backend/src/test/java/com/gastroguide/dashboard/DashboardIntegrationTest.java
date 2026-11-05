package com.gastroguide.dashboard;

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

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Dashboard (04/11/2026): os números vêm do médico autenticado, nada vaza para
 * outro médico, modelo geral não entra na distribuição, cancelada não conta e
 * a secretária é barrada. CRMs 50030–50033.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class DashboardIntegrationTest {

    private static final String URL = "/api/medicos/me/dashboard";

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

    private String signup(String crm) throws Exception {
        String json = """
                {"name":"Dra. Teste","email":"medico%d@teste.com","password":"senha12345","crm":"%s","crmUf":"SP"}
                """.formatted(System.nanoTime(), crm);
        String response = mockMvc.perform(post("/api/auth/cadastro").contentType("application/json").content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    private String createPatient(String token, String name) throws Exception {
        String response = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"%s\"}".formatted(name)))
                .andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String schedule(String token, String patientId, Instant at, String type) throws Exception {
        String response = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"%s","type":"%s"}
                                """.formatted(patientId, at, type)))
                .andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private void header(String token, String patientId, String disease, String body) throws Exception {
        mockMvc.perform(put("/api/pacientes/" + patientId + "/cabecalhos/" + disease)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    void numerosSaoDoMedicoEDistribuicaoIgnoraModeloGeral() throws Exception {
        String token = signup("50030");
        String otherToken = signup("50031");
        String patient = createPatient(token, "Paciente da Dra.");

        Instant inTwoDays = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MINUTES);
        schedule(token, patient, inTwoDays, "RETORNO");
        // Cancelada não conta como retorno marcado.
        String cancelled = schedule(token, patient, inTwoDays.plus(1, ChronoUnit.HOURS), "RETORNO");
        mockMvc.perform(put("/api/agenda/" + cancelled)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"status\":\"CANCELADO\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/links-consulta")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"type\":\"PRIMEIRA_CONSULTA\"}"))
                .andExpect(status().isOk());

        header(token, patient, "drge", "{\"data\":{\"status\":\"Remissão com IBP\"}}");
        header(token, patient, "hepato-geral", "{\"data\":{\"cabecalhoLivre\":\"texto\"}}");

        mockMvc.perform(get(URL).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retornosAgendados.value").value(1))
                .andExpect(jsonPath("$.linksPendentes").value(1))
                .andExpect(jsonPath("$.consultasSemana", hasSize(7)))
                .andExpect(jsonPath("$.distribuicao", hasSize(1)))
                .andExpect(jsonPath("$.distribuicao[0].name").value("DRGE"))
                .andExpect(jsonPath("$.distribuicao[0].patients").value(1));

        mockMvc.perform(get(URL).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.consultasMes.value").value(0))
                .andExpect(jsonPath("$.pacientesAtivos.value").value(0))
                .andExpect(jsonPath("$.retornosAgendados.value").value(0))
                .andExpect(jsonPath("$.linksPendentes").value(0))
                .andExpect(jsonPath("$.distribuicao", hasSize(0)))
                .andExpect(jsonPath("$.proximos", hasSize(0)));
    }

    @Test
    void secretariaNaoVeODashboard() throws Exception {
        String token = signup("50032");
        String email = "secretaria" + System.nanoTime() + "@teste.com";
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Secretária\",\"email\":\"%s\",\"password\":\"senha12345\"}".formatted(email)))
                .andExpect(status().is2xxSuccessful());
        String login = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"%s\",\"password\":\"senha12345\"}".formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secretaryToken = objectMapper.readTree(login).get("accessToken").asText();

        mockMvc.perform(get(URL).header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
    }
}
