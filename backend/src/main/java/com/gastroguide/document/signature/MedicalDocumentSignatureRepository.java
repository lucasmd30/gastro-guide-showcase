package com.gastroguide.document.signature;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalDocumentSignatureRepository extends JpaRepository<MedicalDocumentSignature, UUID> {

    /** Os dados da assinatura sem carregar o PDF (projeção fechada: só essas colunas). */
    interface SignatureInfo {
        String getFileName();

        String getSignerName();

        String getSignerCpf();

        String getIssuer();

        SignatureLevel getLevel();

        Instant getSignedAt();

        int getSignatureCount();

        boolean getCoversDocument();

        Instant getUploadedAt();
    }

    Optional<SignatureInfo> findInfoByDocumentId(UUID documentId);

    @Query("select s.documentId from MedicalDocumentSignature s where s.documentId in :ids")
    List<UUID> findSignedIds(@Param("ids") Collection<UUID> ids);
}
