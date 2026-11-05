package com.gastroguide.secretary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface SecretaryRefreshTokenRepository extends JpaRepository<SecretaryRefreshToken, UUID> {
    Optional<SecretaryRefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update SecretaryRefreshToken t set t.revokedAt = current_timestamp "
            + "where t.secretary.id = :secretaryId and t.revokedAt is null")
    void revokeAllForSecretary(@Param("secretaryId") UUID secretaryId);

    /**
     * Apaga em vez de revogar: um token revogado que reaparece dispara a
     * detecção de reuso, que derrubaria também a sessão aberta com a senha
     * nova. Token que não existe é só "sessão inválida".
     */
    @Modifying
    @Query("delete from SecretaryRefreshToken t where t.secretary.id = :secretaryId")
    void deleteAllForSecretary(@Param("secretaryId") UUID secretaryId);
}
