package com.gastroguide.document.signature;

import java.time.Instant;

/**
 * O que a conferência leu da última assinatura do PDF (a mais recente).
 * {@code coversDocument} falso quer dizer que há bytes acrescentados depois
 * dela — às vezes é só o assinador gravando dados de validação, por isso é
 * aviso e não recusa.
 */
public record SignatureInspection(String signerName, String signerCpf, String issuer, SignatureLevel level,
                                  Instant signedAt, int signatureCount, boolean coversDocument) {
}
