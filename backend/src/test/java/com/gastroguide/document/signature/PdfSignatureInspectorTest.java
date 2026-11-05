package com.gastroguide.document.signature;

import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static com.gastroguide.document.signature.SignedPdfFixtures.pdf;
import static com.gastroguide.document.signature.SignedPdfFixtures.signed;
import static org.junit.jupiter.api.Assertions.*;

/**
 * PDFs assinados de verdade (PAdES destacada, como fazem os assinadores dos
 * certificados em nuvem), com certificados de teste autoassinados.
 */
class PdfSignatureInspectorTest {

    private static final String CODE = "AB12CD34";

    @Test
    void leNomeCpfENivelDeUmECpfIcpBrasil() {
        byte[] pdf = signed(pdf("Atestado medico. Codigo de verificacao: AB12-CD34"),
                "CN=MARIA DA SILVA:12345678909, OU=AC SOLUTI Multipla v5, O=ICP-Brasil, C=BR");

        SignatureInspection result = PdfSignatureInspector.inspect(pdf, CODE);

        assertEquals("MARIA DA SILVA", result.signerName());
        assertEquals("12345678909", result.signerCpf());
        assertEquals(SignatureLevel.ICP_BRASIL, result.level());
        assertEquals(1, result.signatureCount());
        assertTrue(result.coversDocument());
        assertNotNull(result.signedAt());
    }

    @Test
    void assinaturaGovBrEAvancada() {
        byte[] pdf = signed(pdf("Codigo AB12-CD34"), "CN=JOAO SOUZA, O=Gov-Br, C=BR");

        SignatureInspection result = PdfSignatureInspector.inspect(pdf, CODE);

        assertEquals("JOAO SOUZA", result.signerName());
        assertNull(result.signerCpf());
        assertEquals(SignatureLevel.GOV_BR, result.level());
    }

    @Test
    void recusaPdfDeOutroDocumento() {
        byte[] pdf = signed(pdf("Codigo FFFF-0000"), "CN=MARIA:12345678909, O=ICP-Brasil, C=BR");

        InvalidSignedPdfException e = assertThrows(InvalidSignedPdfException.class,
                () -> PdfSignatureInspector.inspect(pdf, CODE));
        assertTrue(e.getMessage().contains("não é deste documento"));
    }

    @Test
    void recusaPdfSemAssinatura() {
        InvalidSignedPdfException e = assertThrows(InvalidSignedPdfException.class,
                () -> PdfSignatureInspector.inspect(pdf("Codigo AB12-CD34"), CODE));
        assertTrue(e.getMessage().contains("não tem assinatura"));
    }

    @Test
    void recusaPdfAlteradoDepoisDeAssinado() {
        byte[] pdf = signed(pdf("Codigo AB12-CD34"), "CN=MARIA:12345678909, O=ICP-Brasil, C=BR");
        // Um byte do comentário binário do cabeçalho: o arquivo continua
        // abrindo, mas deixa de bater com a assinatura.
        byte[] tampered = Arrays.copyOf(pdf, pdf.length);
        tampered[11] ^= 0x01;

        InvalidSignedPdfException e = assertThrows(InvalidSignedPdfException.class,
                () -> PdfSignatureInspector.inspect(tampered, CODE));
        assertTrue(e.getMessage().contains("alterado depois de assinado"));
    }

    @Test
    void avisaQuandoHaBytesDepoisDaAssinatura() {
        byte[] pdf = signed(pdf("Codigo AB12-CD34"), "CN=MARIA:12345678909, O=ICP-Brasil, C=BR");
        byte[] appended = Arrays.copyOf(pdf, pdf.length + 8);
        System.arraycopy("\n%extra\n".getBytes(), 0, appended, pdf.length, 8);

        assertFalse(PdfSignatureInspector.inspect(appended, CODE).coversDocument());
    }

    @Test
    void recusaArquivoQueNaoEPdf() {
        assertThrows(InvalidSignedPdfException.class,
                () -> PdfSignatureInspector.inspect("não sou pdf".getBytes(), CODE));
    }
}
