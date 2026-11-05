package com.gastroguide.auth;

import com.gastroguide.auth.dto.AuthResponse;
import com.gastroguide.auth.dto.LoginRequest;
import com.gastroguide.auth.dto.LogoutRequest;
import com.gastroguide.auth.dto.RefreshRequest;
import com.gastroguide.auth.dto.SignupRequest;
import com.gastroguide.common.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Duration MINUTE = Duration.ofMinutes(1);
    private static final Duration FIFTEEN_MINUTES = Duration.ofMinutes(15);
    private static final Duration ONE_HOUR = Duration.ofHours(1);

    private final AuthService authService;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, RateLimiter rateLimiter) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/cadastro")
    public AuthResponse cadastro(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest) {
        limitOrThrow("signup:ip:" + clientIp(httpRequest), 10, ONE_HOUR);
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        limitOrThrow("login:ip:" + clientIp(httpRequest), 20, Duration.ofMinutes(5));
        limitOrThrow("login:email:" + request.email().trim().toLowerCase(), 5, FIFTEEN_MINUTES);
        return authService.login(request.email(), request.password());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        limitOrThrow("refresh:ip:" + clientIp(httpRequest), 30, MINUTE);
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
    }

    private void limitOrThrow(String key, int maxAttempts, Duration window) {
        if (!rateLimiter.tryConsume(key, maxAttempts, window)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas. Tente novamente em instantes.");
        }
    }

    /**
     * IP real do cliente, para o rate limit.
     *
     * <p>Não lemos {@code X-Forwarded-For} à mão de propósito: esse header é
     * livremente forjável, e escolher "qual hop confiar" na unha é a receita
     * de um rate limit que se contorna variando o header a cada tentativa.
     * Em produção, {@code server.forward-headers-strategy: native}
     * (application-prod.yml) faz o Tomcat resolver isso pelo RemoteIpValve,
     * que descarta os proxies internos conhecidos e entrega o IP real aqui.
     * Em desenvolvimento, sem proxy na frente, este é o IP da conexão.
     */
    private static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
