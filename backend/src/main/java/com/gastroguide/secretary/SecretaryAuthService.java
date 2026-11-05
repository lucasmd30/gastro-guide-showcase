package com.gastroguide.secretary;

import com.gastroguide.auth.JwtService;
import com.gastroguide.auth.dto.AuthResponse;
import com.gastroguide.secretary.dto.SecretaryDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Espelha com.gastroguide.auth.AuthService pro fluxo de secretária — refresh
 * tokens numa tabela própria (secretary_refresh_tokens), rotação e detecção
 * de reuso idênticas, mas isoladas do fluxo de médico já validado.
 */
@Service
public class SecretaryAuthService {

    private final SecretaryRepository secretaryRepository;
    private final SecretaryRefreshTokenRepository refreshTokenRepository;
    private final SecretaryRefreshTokenSecurityService refreshTokenSecurityService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Duration refreshTokenTtl;
    private final SecureRandom random = new SecureRandom();

    public SecretaryAuthService(
            SecretaryRepository secretaryRepository,
            SecretaryRefreshTokenRepository refreshTokenRepository,
            SecretaryRefreshTokenSecurityService refreshTokenSecurityService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${jwt.refresh-token-expiration-days}") long refreshTokenExpirationDays) {
        this.secretaryRepository = secretaryRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenSecurityService = refreshTokenSecurityService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenTtl = Duration.ofDays(refreshTokenExpirationDays);
    }

    /** Usado pelo cadastro de médico pra não deixar o e-mail de uma secretária ser sequestrado por uma conta nova. */
    public boolean existsByEmail(String email) {
        return secretaryRepository.existsByEmail(email);
    }

    /** @return vazio se não existe secretária com esse e-mail (chamador tenta outro tipo de conta). */
    @Transactional
    public Optional<AuthResponse> tryLogin(String email, String password) {
        Optional<Secretary> found = secretaryRepository.findByEmail(email);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        Secretary secretary = found.get();
        if (!passwordEncoder.matches(password, secretary.getPasswordHash())) {
            throw unauthorizedCredentials();
        }
        return Optional.of(issueTokens(secretary));
    }

    /** @return vazio se o hash não corresponde a nenhum refresh token de secretária. */
    @Transactional
    public Optional<AuthResponse> tryRefresh(String tokenHash) {
        Optional<SecretaryRefreshToken> found = refreshTokenRepository.findByTokenHash(tokenHash);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        SecretaryRefreshToken token = found.get();

        if (token.isRevoked()) {
            refreshTokenSecurityService.revokeAllForSecretaryInNewTransaction(token.getSecretary().getId());
            throw unauthorizedSession();
        }
        if (token.isExpired()) {
            throw unauthorizedSession();
        }

        token.revoke();
        refreshTokenRepository.save(token);

        return Optional.of(issueTokens(token.getSecretary()));
    }

    /** Não faz nada se o hash não corresponde a nenhum refresh token de secretária (mesmo padrão do logout de médico). */
    @Transactional
    public void tryLogout(String tokenHash) {
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
        });
    }

    private AuthResponse issueTokens(Secretary secretary) {
        String accessToken = jwtService.generateAccessToken(
                secretary.getId(), "SECRETARIA", secretary.getDoctor().getId());
        String rawRefreshToken = generateRawRefreshToken();

        SecretaryRefreshToken refreshToken = new SecretaryRefreshToken(
                secretary, hash(rawRefreshToken), Instant.now().plus(refreshTokenTtl));
        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, "SECRETARIA", null, SecretaryDto.from(secretary));
    }

    private static ResponseStatusException unauthorizedCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
    }

    private static ResponseStatusException unauthorizedSession() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente.");
    }

    private String generateRawRefreshToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
