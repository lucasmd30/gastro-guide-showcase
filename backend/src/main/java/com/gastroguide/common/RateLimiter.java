package com.gastroguide.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiter de janela fixa, em memória. Suficiente para uma única
 * instância (MVP); se o backend escalar horizontalmente, isso precisa
 * virar um contador compartilhado (ex.: Redis).
 */
@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    // Maior janela usada hoje (cadastro: 1h) — qualquer entrada mais velha que
    // isso já expirou por definição e só ocupa memória à toa. Um atacante que
    // varia a chave a cada tentativa (IP forjado, e-mail arbitrário) faz esse
    // mapa crescer sem limite se nada nunca for removido.
    private static final long STALE_AFTER_MILLIS = Duration.ofHours(1).toMillis();

    private record Window(AtomicInteger count, AtomicLong windowStartMillis) {
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /**
     * @return true se a tentativa foi permitida, false se o limite foi excedido.
     */
    public boolean tryConsume(String key, int maxAttempts, Duration window) {
        Window w = windows.computeIfAbsent(key, k -> new Window(new AtomicInteger(0), new AtomicLong(System.currentTimeMillis())));

        synchronized (w) {
            long now = System.currentTimeMillis();
            if (now - w.windowStartMillis().get() > window.toMillis()) {
                w.windowStartMillis().set(now);
                w.count().set(0);
            }
            return w.count().incrementAndGet() <= maxAttempts;
        }
    }

    /**
     * Zera todas as janelas. Existe pros testes de integração: todos os
     * cenários chegam do mesmo IP (MockMvc) e o contexto Spring é
     * compartilhado entre as classes de teste, então o limite de cadastro
     * (10/hora por IP) estoura antes da suíte terminar.
     */
    public void clear() {
        windows.clear();
    }

    @Scheduled(fixedRate = 15, timeUnit = java.util.concurrent.TimeUnit.MINUTES)
    void evictStaleWindows() {
        long now = System.currentTimeMillis();
        int before = windows.size();
        windows.entrySet().removeIf(entry -> now - entry.getValue().windowStartMillis().get() > STALE_AFTER_MILLIS);
        int removed = before - windows.size();
        if (removed > 0) {
            log.debug("RateLimiter: removidas {} janelas expiradas ({} restantes)", removed, windows.size());
        }
    }
}
