package com.gastroguide.exam;

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

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Solicitação de exames (28/10/2026): combos próprios e favoritos isolados
 * por médico, nome repetido recusado, estrela acompanhando o combo renomeado
 * e sumindo com ele, e secretária barrada. CRMs 50020–50023.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class ExamComboIntegrationTest {

    private static final String BASE = "/api/medicos/me/combos-exames";

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

    private String createCombo(String token, String name) throws Exception {
        String response = mockMvc.perform(post(BASE)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"name":"%s","items":[" Hemograma completo ","Ferritina","Hemograma completo"]}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private void star(String token, String name, boolean favorite) throws Exception {
        mockMvc.perform(put(BASE + "/favoritos")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"%s\",\"favorite\":%s}".formatted(name, favorite)))
                .andExpect(status().isOk());
    }

    @Test
    void salvaComboEFavoritosIsoladosPorMedico() throws Exception {
        String token = signupAndGetAccessToken("50020");
        String otherToken = signupAndGetAccessToken("50021");

        String comboId = createCombo(token, "Anemia da Dra.");
        star(token, "Hepatograma básico", true);
        star(token, "Hepatograma básico", true); // repetir não duplica

        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.combos", hasSize(1)))
                .andExpect(jsonPath("$.combos[0].name").value("Anemia da Dra."))
                // Sem espaços nas pontas e sem o repetido.
                .andExpect(jsonPath("$.combos[0].items", contains("Hemograma completo", "Ferritina")))
                .andExpect(jsonPath("$.favorites", contains("Hepatograma básico")));

        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.combos", hasSize(0)))
                .andExpect(jsonPath("$.favorites", hasSize(0)));

        mockMvc.perform(put(BASE + "/" + comboId)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Invasor\",\"items\":[\"Ureia\"]}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(BASE + "/" + comboId).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());

        star(token, "Hepatograma básico", false);
        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.combos[0].name").value("Anemia da Dra."))
                .andExpect(jsonPath("$.favorites", hasSize(0)));
    }

    @Test
    void recusaNomeRepetidoEEstrelaAcompanhaOCombo() throws Exception {
        String token = signupAndGetAccessToken("50022");
        String comboId = createCombo(token, "Meu combo");

        mockMvc.perform(post(BASE)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"MEU COMBO\",\"items\":[\"Ureia\"]}"))
                .andExpect(status().isConflict());
        mockMvc.perform(post(BASE)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Vazio\",\"items\":[]}"))
                .andExpect(status().isBadRequest());

        star(token, "Meu combo", true);
        mockMvc.perform(put(BASE + "/" + comboId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Combo renomeado\",\"items\":[\"Ureia\",\"Creatinina\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", contains("Ureia", "Creatinina")));
        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.favorites", contains("Combo renomeado")));

        mockMvc.perform(delete(BASE + "/" + comboId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.combos", hasSize(0)))
                .andExpect(jsonPath("$.favorites", hasSize(0)));
    }

    @Test
    void secretariaNaoAcessaCombos() throws Exception {
        String doctorToken = signupAndGetAccessToken("50023");
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
        String secretaryToken = objectMapper.readTree(response).get("accessToken").asText();

        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post(BASE)
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("{\"name\":\"X\",\"items\":[\"Ureia\"]}"))
                .andExpect(status().isForbidden());
    }
}
