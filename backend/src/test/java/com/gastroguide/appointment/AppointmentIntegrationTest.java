package com.gastroguide.appointment;

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
 * Isolamento entre médicos é um dos três fluxos com teste de integração
 * obrigatório (documentação interna). Mesma limitação de Testcontainers desta máquina
 * de dev Windows (não roda aqui) — validado via curl.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class AppointmentIntegrationTest {

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

    private String signupAndGetToken(String crm) throws Exception {
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

    private String createPatient(String token, String name) throws Exception {
        String json = """
                {"name":"%s"}
                """.formatted(name);
        String response = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    @Test
    void criaListaEAtualizaAgendamento() throws Exception {
        String token = signupAndGetToken("40001");
        String patientId = createPatient(token, "Paciente Agenda");

        String createJson = """
                {"patientId":"%s","scheduledAt":"2026-09-01T13:00:00Z","type":"PRIMEIRA_CONSULTA"}
                """.formatted(patientId);
        String response = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGENDADO"))
                .andExpect(jsonPath("$.patientName").value("Paciente Agenda"))
                .andReturn().getResponse().getContentAsString();
        String appointmentId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(get("/api/agenda?from=2026-09-01T00:00:00Z&to=2026-09-01T23:59:59Z")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(put("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"status":"CONFIRMADO"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADO"));

        mockMvc.perform(delete("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/agenda?from=2026-09-01T00:00:00Z&to=2026-09-01T23:59:59Z")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void contratacaoParticularConvenioOuCortesiaComPlanoSoNoConvenio() throws Exception {
        String token = signupAndGetToken("40010");
        String patientId = createPatient(token, "Paciente Convenio");

        // Sem contratação: vale particular.
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"2030-03-04T12:00:00Z","type":"RETORNO"}
                                """.formatted(patientId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billing").value("PARTICULAR"))
                .andExpect(jsonPath("$.healthPlan").doesNotExist());

        // Convênio sem plano não serve para faturar.
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"2030-03-04T13:00:00Z","type":"RETORNO",
                                 "billing":"CONVENIO","healthPlan":"  "}
                                """.formatted(patientId)))
                .andExpect(status().isBadRequest());

        String response = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"2030-03-04T13:00:00Z","type":"RETORNO",
                                 "billing":"CONVENIO","healthPlan":" Unimed Nacional "}
                                """.formatted(patientId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billing").value("CONVENIO"))
                .andExpect(jsonPath("$.healthPlan").value("Unimed Nacional"))
                .andReturn().getResponse().getContentAsString();
        String appointmentId = objectMapper.readTree(response).get("id").asText();

        // Cortesia não guarda plano, mesmo que ele venha no corpo.
        mockMvc.perform(put("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"billing":"CORTESIA","healthPlan":"Unimed Nacional"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billing").value("CORTESIA"))
                .andExpect(jsonPath("$.healthPlan").doesNotExist());

        // Trocar só o status não mexe na contratação.
        mockMvc.perform(put("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"status":"CONFIRMADO"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billing").value("CORTESIA"));
    }

    private String book(String token, String patientId, String scheduledAt, String type) throws Exception {
        String response = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"%s","type":"%s"}
                                """.formatted(patientId, scheduledAt, type)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private org.springframework.test.web.servlet.ResultActions putJson(String token, String id, String json)
            throws Exception {
        return mockMvc.perform(put("/api/agenda/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(json));
    }

    /**
     * O caso de 10/10/2026: a paciente das 10:00 falta e o das 11:00 é
     * adiantado para as 10:00. A falta libera o horário (inclusive no índice
     * único do banco, V24 — mesmo instante exato), e a falta continua
     * registrada.
     */
    @Test
    void faltaLiberaOHorarioParaAdiantarOutroPaciente() throws Exception {
        String token = signupAndGetToken("40011");
        String ana = createPatient(token, "Ana");
        String bruno = createPatient(token, "Bruno");
        String anaId = book(token, ana, "2026-12-04T13:00:00Z", "PRIMEIRA_CONSULTA");
        String brunoId = book(token, bruno, "2026-12-04T14:00:00Z", "RETORNO");

        // Com a Ana ainda agendada, o horário dela está ocupado.
        putJson(token, brunoId, "{\"scheduledAt\":\"2026-12-04T13:00:00Z\"}").andExpect(status().isConflict());

        putJson(token, anaId, "{\"status\":\"FALTOU\"}").andExpect(status().isOk());
        putJson(token, brunoId, "{\"scheduledAt\":\"2026-12-04T13:00:00Z\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scheduledAt").value("2026-12-04T13:00:00Z"));

        // Desfazer a falta agora colidiria com o Bruno: recusado.
        putJson(token, anaId, "{\"status\":\"AGENDADO\"}").andExpect(status().isConflict());
    }

    /**
     * Valor do particular (13/10/2026): padrão por tipo nas durações, aplicado
     * a todo particular novo, ajustável por consulta, e só no particular.
     */
    @Test
    void particularNasceComValorPadraoDoTipoEPodeSerAjustado() throws Exception {
        String token = signupAndGetToken("40013");
        String patient = createPatient(token, "Paciente Valor");
        mockMvc.perform(put("/api/agenda/duracoes")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"firstVisitMinutes":60,"followUpMinutes":30,
                                 "firstVisitPriceCents":45000,"followUpPriceCents":25000}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstVisitPriceCents").value(45000));

        // Sem valor no pedido: o padrão do tipo.
        String consulta = book(token, patient, "2026-12-14T12:00:00Z", "PRIMEIRA_CONSULTA");
        String retorno = book(token, patient, "2026-12-14T14:00:00Z", "RETORNO");
        mockMvc.perform(get("/api/agenda").header("Authorization", "Bearer " + token)
                        .param("from", "2026-12-14T00:00:00Z").param("to", "2026-12-15T00:00:00Z"))
                .andExpect(jsonPath("$[0].priceCents").value(45000))
                .andExpect(jsonPath("$[1].priceCents").value(25000));

        // Ajuste numa consulta só.
        putJson(token, consulta, "{\"billing\":\"PARTICULAR\",\"priceCents\":40000}")
                .andExpect(jsonPath("$.priceCents").value(40000));
        // Fora do particular, o valor some.
        putJson(token, retorno, "{\"billing\":\"CONVENIO\",\"healthPlan\":\"Unimed\"}")
                .andExpect(jsonPath("$.priceCents").doesNotExist());

        // Valor informado já na criação vence o padrão; convênio nasce sem valor.
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"2026-12-15T12:00:00Z","type":"PRIMEIRA_CONSULTA",
                                 "billing":"PARTICULAR","priceCents":30000}
                                """.formatted(patient)))
                .andExpect(jsonPath("$.priceCents").value(30000));
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"2026-12-15T14:00:00Z","type":"PRIMEIRA_CONSULTA",
                                 "billing":"CONVENIO","healthPlan":"Amil","priceCents":30000}
                                """.formatted(patient)))
                .andExpect(jsonPath("$.priceCents").doesNotExist());
    }

    /**
     * Encaixe (19/10/2026): com o flag, o horário ocupado é aceito — inclusive
     * o mesmo instante exato, que o índice único do banco barraria (V28). Sem
     * o flag continua 409, e o encaixe ocupa o horário para quem vem depois.
     */
    @Test
    void encaixeAceitaHorarioJaOcupado() throws Exception {
        String token = signupAndGetToken("40014");
        String ana = createPatient(token, "Ana");
        String bia = createPatient(token, "Bia");
        String caio = createPatient(token, "Caio");
        book(token, ana, "2026-12-09T13:00:00Z", "PRIMEIRA_CONSULTA");

        String sameSlot = """
                {"patientId":"%s","scheduledAt":"2026-12-09T13:00:00Z","type":"RETORNO"%s}
                """;
        mockMvc.perform(post("/api/agenda").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(sameSlot.formatted(bia, "")))
                .andExpect(status().isConflict());
        String encaixe = mockMvc.perform(post("/api/agenda").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(sameSlot.formatted(bia, ",\"encaixe\":true")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encaixe").value(true))
                .andReturn().getResponse().getContentAsString();
        String encaixeId = objectMapper.readTree(encaixe).get("id").asText();

        // O encaixe também segura o horário: um terceiro sem flag é recusado.
        String caioId = book(token, caio, "2026-12-09T15:00:00Z", "RETORNO");
        putJson(token, caioId, "{\"scheduledAt\":\"2026-12-09T13:00:00Z\"}").andExpect(status().isConflict());
        putJson(token, caioId, "{\"scheduledAt\":\"2026-12-09T13:00:00Z\",\"encaixe\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encaixe").value(true));

        // Deixar de ser encaixe no mesmo horário volta a ser conflito.
        putJson(token, encaixeId, "{\"encaixe\":false}").andExpect(status().isConflict());
    }

    /** Remarcar para cima de outro agendamento ativo continua recusado, mesmo com sobreposição parcial. */
    @Test
    void remarcarParaHorarioOcupadoERecusado() throws Exception {
        String token = signupAndGetToken("40012");
        String patient = createPatient(token, "Paciente Remarcar");
        book(token, patient, "2026-12-07T13:00:00Z", "PRIMEIRA_CONSULTA"); // 10:00–10:30 local (30 min)
        String retornoId = book(token, patient, "2026-12-07T15:00:00Z", "RETORNO");

        putJson(token, retornoId, "{\"scheduledAt\":\"2026-12-07T13:15:00Z\"}").andExpect(status().isConflict());
        putJson(token, retornoId, "{\"scheduledAt\":\"2026-12-07T13:30:00Z\"}").andExpect(status().isOk());
    }

    @Test
    void rejeitaHorarioDuplicadoNaCriacaoENaEdicao() throws Exception {
        String token = signupAndGetToken("40002");
        String patientId = createPatient(token, "Paciente Conflito");

        String json = """
                {"patientId":"%s","scheduledAt":"2026-09-02T13:00:00Z","type":"PRIMEIRA_CONSULTA"}
                """.formatted(patientId);
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk());

        // Mesmo horário de novo — conflito na criação.
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isConflict());

        // Um segundo agendamento em horário diferente, depois tenta editar pro mesmo horário do primeiro.
        String secondJson = """
                {"patientId":"%s","scheduledAt":"2026-09-02T14:00:00Z","type":"RETORNO"}
                """.formatted(patientId);
        String secondResponse = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(secondJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secondId = objectMapper.readTree(secondResponse).get("id").asText();

        mockMvc.perform(put("/api/agenda/" + secondId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {"scheduledAt":"2026-09-02T13:00:00Z"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void medicoNaoAcessaAgendamentoDeOutroMedicoNemCriaComPacienteDeOutro() throws Exception {
        String tokenA = signupAndGetToken("40003");
        String patientIdA = createPatient(tokenA, "Paciente Medico A");

        String createJson = """
                {"patientId":"%s","scheduledAt":"2026-09-03T13:00:00Z","type":"PRIMEIRA_CONSULTA"}
                """.formatted(patientIdA);
        String response = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String appointmentId = objectMapper.readTree(response).get("id").asText();

        String tokenB = signupAndGetToken("40004");

        // Médico B não vê o agendamento do médico A.
        mockMvc.perform(put("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("""
                                {"status":"CANCELADO"}
                                """))
                .andExpect(status().isNotFound());

        // Médico B não consegue criar agendamento pro paciente do médico A.
        String crossJson = """
                {"patientId":"%s","scheduledAt":"2026-09-03T14:00:00Z","type":"RETORNO"}
                """.formatted(patientIdA);
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content(crossJson))
                .andExpect(status().isNotFound());
    }

    @Test
    void secretariaTemCrudCompletoNaAgenda() throws Exception {
        String doctorToken = signupAndGetToken("40005");
        String patientId = createPatient(doctorToken, "Paciente Secretaria Agenda");

        String secEmail = "secretariaagenda" + System.nanoTime() + "@teste.com";
        mockMvc.perform(post("/api/medicos/me/secretarias")
                        .header("Authorization", "Bearer " + doctorToken)
                        .contentType("application/json")
                        .content("""
                                {"name":"Secretaria","email":"%s","password":"senha12345"}
                                """.formatted(secEmail)))
                .andExpect(status().isOk());

        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"senha12345"}
                                """.formatted(secEmail)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secretaryToken = objectMapper.readTree(loginResponse).get("accessToken").asText();

        String createJson = """
                {"patientId":"%s","scheduledAt":"2026-09-04T13:00:00Z","type":"PRIMEIRA_CONSULTA"}
                """.formatted(patientId);
        String response = mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content(createJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String appointmentId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(put("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + secretaryToken)
                        .contentType("application/json")
                        .content("""
                                {"status":"CONFIRMADO"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/agenda/" + appointmentId)
                        .header("Authorization", "Bearer " + secretaryToken))
                .andExpect(status().isNoContent());
    }
}
