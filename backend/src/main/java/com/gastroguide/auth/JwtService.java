package com.gastroguide.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration accessTokenTtl;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration-minutes}") long accessTokenExpirationMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = Duration.ofMinutes(accessTokenExpirationMinutes);
    }

    /**
     * @param subjectId id da própria conta autenticada (médico ou secretária)
     * @param role "DOCTOR" ou "SECRETARIA"
     * @param effectiveDoctorId médico dono dos dados que essa conta enxerga —
     *                          pra médico é o próprio id, pra secretária é o
     *                          médico a quem ela pertence
     */
    public String generateAccessToken(UUID subjectId, String role, UUID effectiveDoctorId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(subjectId.toString())
                .claim("role", role)
                .claim("doctorId", effectiveDoctorId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key)
                .compact();
    }

    public record JwtPrincipal(UUID subjectId, UUID doctorId, String role) {
    }

    /**
     * @throws JwtException se o token for inválido, malformado ou expirado.
     */
    public JwtPrincipal parsePrincipal(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        UUID subjectId = UUID.fromString(claims.getSubject());
        // Tokens emitidos antes da claim "role" existir não têm role/doctorId
        // — tratados como DOCTOR (único tipo que existia até então), com
        // doctorId = o próprio subject, exatamente o comportamento antigo.
        String role = claims.get("role", String.class);
        String doctorIdClaim = claims.get("doctorId", String.class);
        UUID doctorId = doctorIdClaim != null ? UUID.fromString(doctorIdClaim) : subjectId;

        return new JwtPrincipal(subjectId, doctorId, role != null ? role : "DOCTOR");
    }
}
