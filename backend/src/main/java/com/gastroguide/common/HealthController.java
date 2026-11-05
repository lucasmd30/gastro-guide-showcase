package com.gastroguide.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Sinal de vida para o healthcheck do Docker e, mais adiante, para o
 * balanceador de carga.
 *
 * <p>Deliberadamente não consulta o banco: se o Postgres estiver fora, o
 * Flyway nem deixa a aplicação subir, então "respondeu aqui" já implica
 * "subiu com o banco". Um health público que toca o banco também vira
 * alavanca de negação de serviço — qualquer um na internet conseguiria
 * gerar carga no banco sem autenticação.
 *
 * <p>Não devolve versão, build nem nome de host: é rota pública, e essas
 * informações só ajudam quem está procurando alvo.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
