package com.gastroguide.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Isolada num bean separado de propósito: a revogação em massa precisa
 * confirmar (REQUIRES_NEW) mesmo quando o método chamador aborta a
 * transação em seguida (ex.: lança ResponseStatusException ao detectar
 * reuso de refresh token) — senão o rollback desfaz a própria revogação
 * de segurança.
 */
@Service
public class RefreshTokenSecurityService {

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenSecurityService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllForDoctorInNewTransaction(UUID doctorId) {
        refreshTokenRepository.revokeAllForDoctor(doctorId);
    }
}
