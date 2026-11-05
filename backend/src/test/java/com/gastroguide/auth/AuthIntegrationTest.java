package com.gastroguide.auth;

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

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class AuthIntegrationTest {

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

    private JsonNode signup(String email, String crm, String crmUf) throws Exception {
        String json = """
                {"name":"Dra. Teste","email":"%s","password":"senha12345","crm":"%s","crmUf":"%s"}
                """.formatted(email, crm, crmUf);

        String response = mockMvc.perform(post("/api/auth/cadastro")
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void cadastroELoginFuncionam() throws Exception {
        String email = uniqueEmail();
        JsonNode signupResponse = signup(email, "11111", "SP");

        assertThatHasTokensAndDoctor(signupResponse, email);

        String loginJson = """
                {"email":"%s","password":"senha12345"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.doctor.email").value(email));
    }

    @Test
    void cadastroComEmailDuplicadoRetorna409() throws Exception {
        String email = uniqueEmail();
        signup(email, "22222", "SP");

        String json = """
                {"name":"Outro","email":"%s","password":"senha12345","crm":"33333","crmUf":"RJ"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/cadastro").contentType("application/json").content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Já existe um médico com esse e-mail."));
    }

    @Test
    void loginComSenhaErradaRetorna401() throws Exception {
        String email = uniqueEmail();
        signup(email, "44444", "SP");

        String json = """
                {"email":"%s","password":"senhaErrada123"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("E-mail ou senha inválidos."));
    }

    @Test
    void refreshRotacionaTokenEBloqueiaReuso() throws Exception {
        String email = uniqueEmail();
        JsonNode signupResponse = signup(email, "55555", "SP");
        String firstRefreshToken = signupResponse.get("refreshToken").asText();

        String refreshJson = """
                {"refreshToken":"%s"}
                """.formatted(firstRefreshToken);

        String secondResponse = mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content(refreshJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode secondTokens = objectMapper.readTree(secondResponse);
        String secondRefreshToken = secondTokens.get("refreshToken").asText();

        // O token novo é diferente do primeiro (rotacionou).
        org.junit.jupiter.api.Assertions.assertNotEquals(firstRefreshToken, secondRefreshToken);

        // Reusar o primeiro (já revogado) token deve falhar.
        mockMvc.perform(post("/api/auth/refresh").contentType("application/json").content(refreshJson))
                .andExpect(status().isUnauthorized());

        // E, por segurança, o segundo token (emitido depois) também deve ter sido revogado
        // como reação ao reuso detectado.
        String secondRefreshJson = """
                {"refreshToken":"%s"}
                """.formatted(secondRefreshToken);
        mockMvc.perform(post("/api/auth/refresh").contentType("application/json").content(secondRefreshJson))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevogaRefreshToken() throws Exception {
        String email = uniqueEmail();
        JsonNode signupResponse = signup(email, "66666", "SP");
        String refreshToken = signupResponse.get("refreshToken").asText();

        String json = """
                {"refreshToken":"%s"}
                """.formatted(refreshToken);

        mockMvc.perform(post("/api/auth/logout").contentType("application/json").content(json))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh").contentType("application/json").content(json))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void perfilExigeAutenticacao() throws Exception {
        mockMvc.perform(get("/api/medicos/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void perfilComTokenValidoFuncionaEPodeSerAtualizado() throws Exception {
        String email = uniqueEmail();
        JsonNode signupResponse = signup(email, "77777", "SP");
        String accessToken = signupResponse.get("accessToken").asText();

        mockMvc.perform(get("/api/medicos/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        String updateJson = """
                {"name":"Dra. Atualizada","phone":"11999998888"}
                """;

        mockMvc.perform(put("/api/medicos/me")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Dra. Atualizada"))
                .andExpect(jsonPath("$.phone").value("11999998888"));
    }

    @Test
    void enderecoComercialEhGravadoEValidadoSemMexerNoResto() throws Exception {
        JsonNode signupResponse = signup(uniqueEmail(), "77779", "SP");
        String accessToken = signupResponse.get("accessToken").asText();

        String address = """
                {"cep":"01310-100","street":"Av. Paulista","number":"1000","complement":"cj. 42",
                 "district":"Bela Vista","city":"São Paulo","state":"sp"}
                """;
        mockMvc.perform(put("/api/medicos/me/endereco")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(address))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.officeAddress.cep").value("01310100"))
                .andExpect(jsonPath("$.officeAddress.state").value("SP"))
                .andExpect(jsonPath("$.officeAddress.complement").value("cj. 42"))
                .andExpect(jsonPath("$.name").value("Dra. Teste"));

        // Atualizar nome/telefone não apaga o endereço (endpoints separados).
        mockMvc.perform(put("/api/medicos/me")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Dra. Outra\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.officeAddress.city").value("São Paulo"));

        mockMvc.perform(put("/api/medicos/me/endereco")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("{\"cep\":\"0131\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/medicos/me/endereco")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("{\"state\":\"XX\"}"))
                .andExpect(status().isBadRequest());

        // Recusado não grava nada; endereço em branco limpa tudo.
        mockMvc.perform(get("/api/medicos/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(jsonPath("$.officeAddress.street").value("Av. Paulista"));
        mockMvc.perform(put("/api/medicos/me/endereco")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.officeAddress.street").value(org.hamcrest.Matchers.nullValue()));
    }

    private void assertThatHasTokensAndDoctor(JsonNode response, String email) {
        org.junit.jupiter.api.Assertions.assertNotNull(response.get("accessToken").asText());
        org.junit.jupiter.api.Assertions.assertNotNull(response.get("refreshToken").asText());
        org.junit.jupiter.api.Assertions.assertEquals(email, response.get("doctor").get("email").asText());
    }
}
