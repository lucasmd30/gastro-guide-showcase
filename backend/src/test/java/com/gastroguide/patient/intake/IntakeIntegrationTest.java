package com.gastroguide.patient.intake;

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

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;

import static com.gastroguide.availability.AvailabilityService.ZONE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * O link de consulta é a única porta pública do sistema, então o que
 * importa aqui é: um token só alcança o médico dele, vale uma vez só, e o
 * agendamento é atômico (horário inválido não pode deixar paciente
 * cadastrado para trás). Não roda nesta máquina de dev — ver "Nota sobre
 * testes de integração" na documentação interna.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class IntakeIntegrationTest {

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

    private String signupAndGetAccessToken(String crm) throws Exception {
        String json = """
                {"name":"Dra. Teste","email":"medico%d@teste.com","password":"senha12345","crm":"%s","crmUf":"SP"}
                """.formatted(System.nanoTime(), crm);

        String response = mockMvc.perform(post("/api/auth/cadastro")
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    /** Janela aberta a partir de hoje, segunda a sexta, 08:00-12:00, para o médico do token. */
    private void createWeekdayAvailability(String accessToken) throws Exception {
        StringBuilder rules = new StringBuilder();
        for (DayOfWeek weekday : new DayOfWeek[] { DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY }) {
            if (rules.length() > 0) {
                rules.append(',');
            }
            rules.append("""
                    {"weekday":"%s","startTime":"08:00","endTime":"12:00"}""".formatted(weekday));
        }
        mockMvc.perform(post("/api/agenda/janelas")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {"startDate":"%s","rules":[%s]}
                                """.formatted(java.time.LocalDate.now(ZONE), rules)))
                .andExpect(status().isCreated());
    }

    private String generateLink(String accessToken, String body) throws Exception {
        String response = mockMvc.perform(post("/api/links-consulta")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    /** Primeiro horário livre que o próprio backend oferece para esse token. */
    private String firstSlot(String linkToken) throws Exception {
        String response = mockMvc.perform(get("/api/intake/" + linkToken + "/horarios"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode slots = objectMapper.readTree(response);
        return slots.get(0).get("scheduledAt").asText();
    }

    private String scheduleBody(String name, String cpf, String scheduledAt) {
        String cpfField = cpf == null ? "" : "\"cpf\":\"%s\",".formatted(cpf);
        return """
                {"patient":{"name":"%s",%s"phone":"11999998888","email":"paciente@teste.com"},"scheduledAt":"%s","billing":"PARTICULAR"}
                """.formatted(name, cpfField, scheduledAt);
    }

    @Test
    void gerarLinkExigeAutenticacao() throws Exception {
        mockMvc.perform(post("/api/links-consulta")
                        .contentType("application/json")
                        .content("{\"type\":\"PRIMEIRA_CONSULTA\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenInvalidoNaoRevelaSeExistiu() throws Exception {
        mockMvc.perform(get("/api/intake/token-que-nunca-existiu"))
                .andExpect(status().isNotFound());
    }

    @Test
    void linkSemPacienteCriaCadastroEAgendamento() throws Exception {
        String doctor = signupAndGetAccessToken("30001");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{\"type\":\"PRIMEIRA_CONSULTA\"}");

        // Antes de preencher, o link não conhece paciente nenhum.
        mockMvc.perform(get("/api/intake/" + link))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patient").doesNotExist())
                .andExpect(jsonPath("$.appointmentType").value("PRIMEIRA_CONSULTA"));

        String slot = firstSlot(link);
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("Paciente do Link", "52998224725", slot)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("Paciente do Link"));

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Paciente do Link"));
    }

    @Test
    void linkValeUmaVezSo() throws Exception {
        String doctor = signupAndGetAccessToken("30002");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{\"type\":\"PRIMEIRA_CONSULTA\"}");

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("Primeiro Uso", null, firstSlot(link))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/intake/" + link)).andExpect(status().isNotFound());
    }

    @Test
    void cpfEDataDeNascimentoCertosAtualizamEmVezDeDuplicar() throws Exception {
        String doctor = signupAndGetAccessToken("30003");
        createWeekdayAvailability(doctor);
        createPatient(doctor, """
                {"name":"Cadastro Antigo","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));

        String link = generateLink(doctor, "{\"type\":\"PRIMEIRA_CONSULTA\"}");
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"Nome Atualizado","cpf":"%s","birthDate":"1988-07-21","phone":"11999998888","email":"paciente@teste.com"}}
                                """.formatted(firstSlot(link), CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("Nome Atualizado"));

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Nome Atualizado"));
    }

    /**
     * Só o CPF não prova quem é: quem tem um link aberto não pode reescrever o
     * cadastro de outra pessoa, e a resposta não pode devolver o nome gravado.
     * A consulta fica no cadastro existente, que a clínica confere depois.
     */
    @Test
    void agendamentoComDataDeNascimentoErradaNaoSobrescreveCadastro() throws Exception {
        String doctor = signupAndGetAccessToken("30060");
        createWeekdayAvailability(doctor);
        String patientId = createPatient(doctor, """
                {"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21","phone":"11988887777","email":"carlos@teste.com"}
                """.formatted(CPF_VALIDO));
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"INVASOR","cpf":"%s","birthDate":"1990-01-01","phone":"11999998888","email":"invasor@teste.com"}}
                                """.formatted(slot, CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("INVASOR"));

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Carlos Souza"))
                .andExpect(jsonPath("$.items[0].birthDate").value("1988-07-21"))
                .andExpect(jsonPath("$.items[0].phone").value("11988887777"))
                .andExpect(jsonPath("$.items[0].email").value("carlos@teste.com"));

        Instant start = Instant.parse(slot);
        mockMvc.perform(get("/api/agenda").header("Authorization", "Bearer " + doctor)
                        .param("from", start.minusSeconds(60).toString())
                        .param("to", start.plusSeconds(60).toString()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].patientId").value(patientId));
    }

    /** Cadastro sem data de nascimento não tem segundo fator: também não pode ser reescrito. */
    @Test
    void agendamentoSemDataDeNascimentoNaoSobrescreveCadastro() throws Exception {
        String doctor = signupAndGetAccessToken("30061");
        createWeekdayAvailability(doctor);
        createPatient(doctor, """
                {"name":"Cadastro Antigo","cpf":"%s"}
                """.formatted(CPF_VALIDO));

        String link = generateLink(doctor, "{\"type\":\"RETORNO\"}");
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("INVASOR", CPF_VALIDO, firstSlot(link))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("INVASOR"));

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Cadastro Antigo"));
    }

    @Test
    void horarioForaDaGradeNaoCriaPaciente() throws Exception {
        String doctor = signupAndGetAccessToken("30004");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{\"type\":\"PRIMEIRA_CONSULTA\"}");

        // Domingo: nenhuma faixa cadastrada.
        Instant domingo = LocalDate.now(ZONE).with(TemporalAdjusters.next(DayOfWeek.SUNDAY))
                .atTime(LocalTime.of(9, 0)).atZone(ZONE).toInstant();

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("Nao Deve Existir", null, domingo.toString())))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(0));
        // E o link continua valendo, já que nada foi consumido.
        mockMvc.perform(get("/api/intake/" + link)).andExpect(status().isOk());
    }

    @Test
    void horarioJaOcupadoEhRecusado() throws Exception {
        String doctor = signupAndGetAccessToken("30005");
        createWeekdayAvailability(doctor);

        String primeiro = generateLink(doctor, "{\"type\":\"PRIMEIRA_CONSULTA\"}");
        String slot = firstSlot(primeiro);
        mockMvc.perform(post("/api/intake/" + primeiro + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("Chegou Antes", null, slot)))
                .andExpect(status().isOk());

        String segundo = generateLink(doctor, "{\"type\":\"PRIMEIRA_CONSULTA\"}");
        mockMvc.perform(post("/api/intake/" + segundo + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("Chegou Depois", null, slot)))
                .andExpect(status().isConflict());
    }

    @Test
    void gradeDeUmMedicoNaoVazaParaOutro() throws Exception {
        String comGrade = signupAndGetAccessToken("30006");
        createWeekdayAvailability(comGrade);
        String semGrade = signupAndGetAccessToken("30007");

        String link = generateLink(semGrade, "{\"type\":\"PRIMEIRA_CONSULTA\"}");
        mockMvc.perform(get("/api/intake/" + link + "/horarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void linkDeOutroMedicoNaoAlcancaPacienteAlheio() throws Exception {
        String doctorA = signupAndGetAccessToken("30008");
        String responseA = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + doctorA)
                        .contentType("application/json")
                        .content("{\"name\":\"Paciente do A\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String patientA = objectMapper.readTree(responseA).get("id").asText();

        String doctorB = signupAndGetAccessToken("30009");
        mockMvc.perform(post("/api/links-consulta")
                        .header("Authorization", "Bearer " + doctorB)
                        .contentType("application/json")
                        .content("{\"patientId\":\"%s\",\"type\":\"RETORNO\"}".formatted(patientA)))
                .andExpect(status().isNotFound());
    }

    // --- Escolha do tipo pelo paciente e identificação no retorno (V14) ---

    /** CPFs com dígito verificador válido — o backend rejeita qualquer outro. */
    private static final String CPF_VALIDO = "52998224725";
    private static final String OUTRO_CPF_VALIDO = "11144477735";

    private String createPatient(String accessToken, String body) throws Exception {
        String response = mockMvc.perform(post("/api/pacientes")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String identify(String linkToken, String cpf, String birthDate) throws Exception {
        return mockMvc.perform(post("/api/intake/" + linkToken + "/identificar")
                        .contentType("application/json")
                        .content("""
                                {"cpf":"%s","birthDate":"%s"}
                                """.formatted(cpf, birthDate)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void identificacaoAchaPacientePorCpfEDataDeNascimento() throws Exception {
        String doctor = signupAndGetAccessToken("30010");
        createWeekdayAvailability(doctor);
        createPatient(doctor, """
                {"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));
        String link = generateLink(doctor, "{}");

        JsonNode found = objectMapper.readTree(identify(link, CPF_VALIDO, "1988-07-21"));
        assertTrue(found.get("found").asBoolean());
        assertEquals("Carlos Souza", found.get("name").asText());
    }

    /**
     * O segundo fator é o que impede o link de virar consultador de cadastro:
     * com o CPF certo mas a data errada, nada pode vazar.
     */
    @Test
    void identificacaoNaoRevelaNadaComDataDeNascimentoErrada() throws Exception {
        String doctor = signupAndGetAccessToken("30011");
        createWeekdayAvailability(doctor);
        createPatient(doctor, """
                {"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));
        String link = generateLink(doctor, "{}");

        JsonNode result = objectMapper.readTree(identify(link, CPF_VALIDO, "1990-01-01"));
        assertFalse(result.get("found").asBoolean());
        assertTrue(result.get("name").isNull());
    }

    /** Um token só enxerga os pacientes do médico dele — nem por CPF certo. */
    @Test
    void identificacaoNaoAlcancaPacienteDeOutroMedico() throws Exception {
        String doctorA = signupAndGetAccessToken("30012");
        createPatient(doctorA, """
                {"name":"Paciente do A","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));

        String doctorB = signupAndGetAccessToken("30013");
        createWeekdayAvailability(doctorB);
        String linkDoB = generateLink(doctorB, "{}");

        JsonNode result = objectMapper.readTree(identify(linkDoB, CPF_VALIDO, "1988-07-21"));
        assertFalse(result.get("found").asBoolean());
    }

    /**
     * A guarda central do retorno: o corpo do agendamento vem do navegador,
     * então quem tiver o link não pode usá-lo para reescrever o cadastro que
     * o consultório já mantém.
     */
    @Test
    void retornoIdentificadoNaoSobrescreveCadastroExistente() throws Exception {
        String doctor = signupAndGetAccessToken("30014");
        createWeekdayAvailability(doctor);
        createPatient(doctor, """
                {"name":"Joao Original","cpf":"%s","birthDate":"1975-03-02","phone":"11999998888"}
                """.formatted(CPF_VALIDO));
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"RETORNO","billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"INVASOR","cpf":"%s","birthDate":"1975-03-02"}}
                                """.formatted(slot, CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("Joao Original"));

        String patients = mockMvc.perform(get("/api/pacientes")
                        .header("Authorization", "Bearer " + doctor))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode item = objectMapper.readTree(patients).get("items").get(0);
        assertEquals("Joao Original", item.get("name").asText());
        // O telefone que o paciente não mandou também não pode ter sido apagado.
        assertEquals("11999998888", item.get("phone").asText());
    }

    /** Retorno sem cadastro correspondente cai no caminho de paciente novo. */
    @Test
    void retornoSemCadastroCriaPacienteNovo() throws Exception {
        String doctor = signupAndGetAccessToken("30015");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"RETORNO","billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"Nunca Veio","cpf":"%s","birthDate":"1999-09-09","phone":"11999998888","email":"paciente@teste.com"}}
                                """.formatted(slot, OUTRO_CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("Nunca Veio"));
    }

    /** Link novo não carrega tipo: sem a escolha do paciente, não dá para agendar. */
    @Test
    void linkNovoSemTipoEscolhidoRecusaAgendamento() throws Exception {
        String doctor = signupAndGetAccessToken("30016");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(scheduleBody("Sem Tipo", OUTRO_CPF_VALIDO, slot)))
                .andExpect(status().isBadRequest());
    }

    /**
     * Compatibilidade: link gerado antes da V14 já traz o tipo no token, e ele
     * prevalece — senão um link em circulação mudaria de comportamento.
     */
    @Test
    void linkAntigoMantemOTipoDoTokenSobreAEscolhaDoPaciente() throws Exception {
        String doctor = signupAndGetAccessToken("30017");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{\"type\":\"RETORNO\"}");
        String slot = firstSlot(link);

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"Link Antigo","cpf":"%s","phone":"11999998888","email":"paciente@teste.com"}}
                                """.formatted(slot, OUTRO_CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("RETORNO"));
    }

    // --- Consulta já marcada pela secretária: o link não oferece outra ---

    /** Marca pela agenda (como a secretária faz) o primeiro horário livre de primeira consulta. */
    private String bookViaAgenda(String accessToken, String patientId) throws Exception {
        String slots = mockMvc.perform(get("/api/agenda/horarios?tipo=PRIMEIRA_CONSULTA")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String slot = objectMapper.readTree(slots).get(0).get("scheduledAt").asText();
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"%s","type":"PRIMEIRA_CONSULTA"}
                                """.formatted(patientId, slot)))
                .andExpect(status().isOk());
        return slot;
    }

    /**
     * O fluxo da secretária: marca só com o nome, gera o link, e o paciente
     * vê a consulta e completa o cadastro — sem calendário, sem nova consulta.
     */
    @Test
    void linkDePacienteComConsultaMarcadaSoCompletaCadastro() throws Exception {
        String doctor = signupAndGetAccessToken("30018");
        createWeekdayAvailability(doctor);
        String patientId = createPatient(doctor, "{\"name\":\"So o Nome\"}");
        String slot = bookViaAgenda(doctor, patientId);
        String link = generateLink(doctor, "{\"patientId\":\"%s\"}".formatted(patientId));

        mockMvc.perform(get("/api/intake/" + link))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcoming.scheduledAt").value(slot));

        mockMvc.perform(post("/api/intake/" + link + "/cadastro")
                        .contentType("application/json")
                        .content("""
                                {"name":"Nome Completo","cpf":"%s","phone":"11999998888","email":"paciente@teste.com"}
                                """.formatted(CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientName").value("Nome Completo"))
                .andExpect(jsonPath("$.upcoming.scheduledAt").value(slot));

        mockMvc.perform(get("/api/pacientes/" + patientId).header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.cpf").value(CPF_VALIDO));
        // Uso único, como o agendamento.
        mockMvc.perform(get("/api/intake/" + link)).andExpect(status().isNotFound());
    }

    /**
     * Link de autoagendamento que ficou aberto enquanto a secretária marcava:
     * tentar agendar por ele é recusado, e nada muda na agenda.
     */
    @Test
    void linkAbertoNaoAgendaSegundaConsultaSeSecretariaJaMarcou() throws Exception {
        String doctor = signupAndGetAccessToken("30019");
        createWeekdayAvailability(doctor);
        String patientId = createPatient(doctor, "{\"name\":\"Paciente Ficha\"}");
        String link = generateLink(doctor, "{\"patientId\":\"%s\"}".formatted(patientId));
        String secretarySlot = bookViaAgenda(doctor, patientId);

        String otherSlot = objectMapper.readTree(mockMvc.perform(get("/api/intake/" + link + "/horarios"))
                .andReturn().getResponse().getContentAsString()).get(1).get("scheduledAt").asText();
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"RETORNO","billing":"PARTICULAR","scheduledAt":"%s","patient":{"name":"Paciente Ficha"}}
                                """.formatted(otherSlot)))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/intake/" + link))
                .andExpect(jsonPath("$.upcoming.scheduledAt").value(secretarySlot));
    }

    /** Link sem paciente: a identificação do retorno já avisa da consulta existente. */
    @Test
    void identificacaoMostraConsultaJaMarcadaERecusaOutra() throws Exception {
        String doctor = signupAndGetAccessToken("30020");
        createWeekdayAvailability(doctor);
        String patientId = createPatient(doctor, """
                {"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));
        String secretarySlot = bookViaAgenda(doctor, patientId);
        String link = generateLink(doctor, "{}");

        JsonNode found = objectMapper.readTree(identify(link, CPF_VALIDO, "1988-07-21"));
        assertEquals(secretarySlot, found.get("upcoming").get("scheduledAt").asText());

        String otherSlot = objectMapper.readTree(mockMvc.perform(get("/api/intake/" + link + "/horarios?tipo=RETORNO"))
                .andReturn().getResponse().getContentAsString()).get(0).get("scheduledAt").asText();
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"RETORNO","billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21"}}
                                """.formatted(otherSlot, CPF_VALIDO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("já tem uma consulta")));
    }

    /**
     * Só com o CPF (sem a data de nascimento certa) a recusa não pode revelar
     * a data da consulta de outra pessoa.
     */
    @Test
    void recusaPorConsultaExistenteNaoRevelaDataSemSegundoFator() throws Exception {
        String doctor = signupAndGetAccessToken("30021");
        createWeekdayAvailability(doctor);
        String patientId = createPatient(doctor, """
                {"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));
        bookViaAgenda(doctor, patientId);
        String link = generateLink(doctor, "{}");
        String slot = objectMapper.readTree(mockMvc.perform(get("/api/intake/" + link + "/horarios"))
                .andReturn().getResponse().getContentAsString()).get(0).get("scheduledAt").asText();

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","billing":"PARTICULAR","scheduledAt":"%s",
                                 "patient":{"name":"Curioso","cpf":"%s","birthDate":"1990-01-01"}}
                                """.formatted(slot, CPF_VALIDO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("às"))));

        // E o cadastro não foi sobrescrito pela tentativa.
        mockMvc.perform(get("/api/pacientes/" + patientId).header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.name").value("Carlos Souza"));
    }

    /** Link sem consulta marcada não aceita o caminho "só cadastro". */
    @Test
    void cadastroSemConsultaMarcadaEhRecusado() throws Exception {
        String doctor = signupAndGetAccessToken("30022");
        createWeekdayAvailability(doctor);
        String patientId = createPatient(doctor, "{\"name\":\"Sem Consulta\"}");
        String link = generateLink(doctor, "{\"patientId\":\"%s\"}".formatted(patientId));

        mockMvc.perform(get("/api/intake/" + link))
                .andExpect(jsonPath("$.upcoming").doesNotExist());
        mockMvc.perform(post("/api/intake/" + link + "/cadastro")
                        .contentType("application/json")
                        .content("{\"name\":\"Outro Nome\"}"))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/intake/" + link)).andExpect(status().isOk());
    }

    // --- Link de cadastro (V20): só dados, nunca horário ---

    /** Link de cadastro da ficha: vale mesmo sem consulta marcada. */
    @Test
    void linkDeCadastroDaFichaAtualizaPacienteSemConsulta() throws Exception {
        String doctor = signupAndGetAccessToken("30030");
        String patientId = createPatient(doctor, "{\"name\":\"So o Nome\"}");
        String link = generateLink(doctor,
                "{\"patientId\":\"%s\",\"purpose\":\"CADASTRO\"}".formatted(patientId));

        mockMvc.perform(get("/api/intake/" + link))
                .andExpect(jsonPath("$.purpose").value("CADASTRO"));
        mockMvc.perform(post("/api/intake/" + link + "/cadastro")
                        .contentType("application/json")
                        .content("{\"name\":\"Nome Completo\",\"phone\":\"11999998888\",\"email\":\"paciente@teste.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcoming").doesNotExist());

        mockMvc.perform(get("/api/pacientes/" + patientId).header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.name").value("Nome Completo"));
        mockMvc.perform(get("/api/intake/" + link)).andExpect(status().isNotFound());
    }

    /** Link de cadastro não marca consulta, nem mandando o corpo na mão. */
    @Test
    void linkDeCadastroNaoAgenda() throws Exception {
        String doctor = signupAndGetAccessToken("30031");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{\"purpose\":\"CADASTRO\"}");
        String slot = firstSlot(link);

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("""
                                {"type":"PRIMEIRA_CONSULTA","billing":"PARTICULAR","scheduledAt":"%s","patient":{"name":"Tentativa"}}
                                """.formatted(slot)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    /** Link de cadastro sem paciente (da lista) cria o cadastro. */
    @Test
    void linkDeCadastroSemPacienteCriaCadastro() throws Exception {
        String doctor = signupAndGetAccessToken("30032");
        String link = generateLink(doctor, "{\"purpose\":\"CADASTRO\"}");

        mockMvc.perform(post("/api/intake/" + link + "/cadastro")
                        .contentType("application/json")
                        .content("{\"name\":\"Paciente Novo\",\"cpf\":\"%s\",\"phone\":\"11999998888\",\"email\":\"paciente@teste.com\"}".formatted(CPF_VALIDO)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Paciente Novo"));
    }

    /**
     * Link de cadastro sem paciente com CPF de alguém já cadastrado: sem a
     * data de nascimento certa, o cadastro existente não pode ser reescrito
     * nem duplicado, e a resposta não revela nada dele.
     */
    @Test
    void linkDeCadastroSemPacienteNaoSobrescreveCpfExistente() throws Exception {
        String doctor = signupAndGetAccessToken("30033");
        String patientId = createPatient(doctor, """
                {"name":"Carlos Souza","cpf":"%s","birthDate":"1988-07-21"}
                """.formatted(CPF_VALIDO));
        bookViaAgendaWithoutGrid(doctor, patientId);
        String link = generateLink(doctor, "{\"purpose\":\"CADASTRO\"}");

        mockMvc.perform(post("/api/intake/" + link + "/cadastro")
                        .contentType("application/json")
                        .content("""
                                {"name":"INVASOR","cpf":"%s","birthDate":"1990-01-01","phone":"11999998888","email":"paciente@teste.com"}
                                """.formatted(CPF_VALIDO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcoming").doesNotExist());

        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Carlos Souza"));
    }

    // --- Contratação no link (08/10/2026): particular ou um dos convênios do médico ---

    private void addHealthPlan(String accessToken, String name) throws Exception {
        mockMvc.perform(post("/api/medicos/me/convenios")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("{\"name\":\"%s\"}".formatted(name)))
                .andExpect(status().isOk());
    }

    /** Os convênios do perfil chegam ao link, e o escolhido vai para o agendamento. */
    @Test
    void convenioDoPerfilChegaAoLinkEVaiParaOAgendamento() throws Exception {
        String doctor = signupAndGetAccessToken("30050");
        createWeekdayAvailability(doctor);
        addHealthPlan(doctor, "Unimed");
        addHealthPlan(doctor, "Bradesco Saude");
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);

        mockMvc.perform(get("/api/intake/" + link))
                .andExpect(jsonPath("$.healthPlans.length()").value(2))
                .andExpect(jsonPath("$.healthPlans[0]").value("Bradesco Saude"));

        String body = """
                {"type":"PRIMEIRA_CONSULTA","scheduledAt":"%s","billing":"CONVENIO","healthPlan":"%s",
                 "patient":{"name":"Paciente Convenio","phone":"11999998888","email":"paciente@teste.com"}}
                """;
        // Convênio que o médico não atende: recusado, nada gravado.
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json").content(body.formatted(slot, "Amil")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(0));

        // Grafia diferente vale, e o agendamento guarda a do perfil.
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json").content(body.formatted(slot, "unimed")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billing").value("CONVENIO"))
                .andExpect(jsonPath("$.healthPlan").value("Unimed"));

        mockMvc.perform(get("/api/agenda").header("Authorization", "Bearer " + doctor)
                        .param("from", Instant.now().toString())
                        .param("to", Instant.now().plus(java.time.Duration.ofDays(90)).toString()))
                .andExpect(jsonPath("$[0].billing").value("CONVENIO"))
                .andExpect(jsonPath("$[0].healthPlan").value("Unimed"));
    }

    /** Sem a escolha, ou com cortesia (que é decisão da clínica), o link não agenda. */
    @Test
    void agendarPeloLinkExigeParticularOuConvenio() throws Exception {
        String doctor = signupAndGetAccessToken("30051");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);
        String patient = "\"patient\":{\"name\":\"Fulano\",\"phone\":\"11999998888\",\"email\":\"f@teste.com\"}";

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("{\"type\":\"RETORNO\",\"scheduledAt\":\"%s\",%s}".formatted(slot, patient)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("{\"type\":\"RETORNO\",\"billing\":\"CORTESIA\",\"scheduledAt\":\"%s\",%s}"
                                .formatted(slot, patient)))
                .andExpect(status().isBadRequest());
        // Médico sem convênio cadastrado: convênio nenhum é aceito.
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content("{\"type\":\"RETORNO\",\"billing\":\"CONVENIO\",\"healthPlan\":\"Unimed\",\"scheduledAt\":\"%s\",%s}"
                                .formatted(slot, patient)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    /** Telefone e e-mail passaram a ser obrigatórios no link; CPF deixou de ser. */
    @Test
    void linkExigeTelefoneEEmailMasNaoCpf() throws Exception {
        String doctor = signupAndGetAccessToken("30052");
        createWeekdayAvailability(doctor);
        String link = generateLink(doctor, "{}");
        String slot = firstSlot(link);
        String body = "{\"type\":\"PRIMEIRA_CONSULTA\",\"billing\":\"PARTICULAR\",\"scheduledAt\":\"%s\",\"patient\":%s}";

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(body.formatted(slot, "{\"name\":\"Sem Email\",\"phone\":\"11999998888\"}")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(body.formatted(slot, "{\"name\":\"Sem Telefone\",\"email\":\"a@teste.com\"}")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + doctor))
                .andExpect(jsonPath("$.items.length()").value(0));

        mockMvc.perform(post("/api/intake/" + link + "/agendar")
                        .contentType("application/json")
                        .content(body.formatted(slot,
                                "{\"name\":\"Sem CPF\",\"phone\":\"(11) 99999-8888\",\"email\":\"a@teste.com\"}")))
                .andExpect(status().isOk());
    }

    /** A lista é do médico: outro médico não vê nem apaga, e a secretária não mexe. */
    @Test
    void conveniosIsoladosPorMedico() throws Exception {
        String doctorA = signupAndGetAccessToken("30053");
        String doctorB = signupAndGetAccessToken("30054");
        String response = mockMvc.perform(post("/api/medicos/me/convenios")
                        .header("Authorization", "Bearer " + doctorA)
                        .contentType("application/json")
                        .content("{\"name\":\"SulAmerica\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String planId = objectMapper.readTree(response).get(0).get("id").asText();

        // Repetido (sem diferenciar maiúsculas) é conflito.
        mockMvc.perform(post("/api/medicos/me/convenios")
                        .header("Authorization", "Bearer " + doctorA)
                        .contentType("application/json")
                        .content("{\"name\":\"sulamerica\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/medicos/me/convenios").header("Authorization", "Bearer " + doctorB))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(delete("/api/medicos/me/convenios/" + planId).header("Authorization", "Bearer " + doctorB))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/medicos/me/convenios/" + planId).header("Authorization", "Bearer " + doctorA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    /** Agenda direta pela API, sem depender da grade (a agenda aceita encaixe). */
    private void bookViaAgendaWithoutGrid(String accessToken, String patientId) throws Exception {
        Instant amanha = Instant.now().plus(java.time.Duration.ofDays(1));
        mockMvc.perform(post("/api/agenda")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {"patientId":"%s","scheduledAt":"%s","type":"RETORNO"}
                                """.formatted(patientId, amanha)))
                .andExpect(status().isOk());
    }
}
