package com.gastroguide.medicalrecord;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class DiseaseControllerTest {

    private final DiseaseController controller = new DiseaseController();

    @Test
    void listaTodasAsDoencasDoMotor() {
        // 10 doenças do "Prontuário modelo" original + CBP/CEP/Esteatose
        // (as 3 restantes da aba Hepatologia do protótipo Lovable) + os 4
        // modelos gerais de consulta (hepato-geral, gastro-op1, gastro-branco
        // e pagina-branca), menos a "opção 3" (gastro-op2), aposentada em
        // 06/10/2026 — atualizar aqui sempre que um modelo entrar ou sair.
        var list = controller.list();
        assertEquals(16, list.size());
    }

    @Test
    void modeloAposentadoSaiDaListaMasContinuaComConfig() {
        // Registros antigos de gastro-op2 precisam da config para imprimir.
        assertTrue(controller.list().stream().noneMatch(d -> d.slug().equals("gastro-op2")));
        assertEquals("gastro-op2", controller.config("gastro-op2").slug());
    }

    @Test
    void gastroGuiadaVemAntesDaLivreNaAbaGastro() {
        var slugs = controller.list().stream().map(d -> d.slug()).toList();
        assertTrue(slugs.indexOf("gastro-op1") < slugs.indexOf("gastro-branco"));
        assertTrue(slugs.indexOf("gastro-branco") < slugs.indexOf("pagina-branca"));
        assertTrue(slugs.indexOf("pagina-branca") < slugs.indexOf("drge"));
    }

    @Test
    void retornaConfigDeUmaDoencaValida() {
        var config = controller.config("drge");
        assertEquals("DRGE", config.shortName());
        assertFalse(config.fields().isEmpty());
    }

    @Test
    void lancaErroPraDoencaInvalida() {
        assertThrows(ResponseStatusException.class, () -> controller.config("doenca-fake"));
    }
}
