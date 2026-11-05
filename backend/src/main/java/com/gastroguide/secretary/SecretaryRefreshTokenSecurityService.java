package com.gastroguide.secretary;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Espelha RefreshTokenSecurityService (com.gastroguide.auth): a revogação em
 * massa precisa confirmar (REQUIRES_NEW) mesmo quando o método chamador
 * aborta a transação em seguida ao detectar reuso de refresh token.
 */
@Service
public class SecretaryRefreshTokenSecurityService {

    private final SecretaryRefreshTokenRepository secretaryRefreshTokenRepository;

    public SecretaryRefreshTokenSecurityService(SecretaryRefreshTokenRepository secretaryRefreshTokenRepository) {
        this.secretaryRefreshTokenRepository = secretaryRefreshTokenRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllForSecretaryInNewTransaction(UUID secretaryId) {
        secretaryRefreshTokenRepository.revokeAllForSecretary(secretaryId);
    }
}
