package com.gastroguide.document.signature;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.apache.pdfbox.text.PDFTextStripper;
import org.bouncycastle.asn1.ASN1Encodable;
import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.asn1.ASN1OctetString;
import org.bouncycastle.asn1.ASN1Primitive;
import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.asn1.ASN1String;
import org.bouncycastle.asn1.ASN1TaggedObject;
import org.bouncycastle.asn1.cms.Attribute;
import org.bouncycastle.asn1.cms.CMSAttributes;
import org.bouncycastle.asn1.cms.Time;
import org.bouncycastle.asn1.x500.RDN;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x500.style.BCStyle;
import org.bouncycastle.asn1.x500.style.IETFUtils;
import org.bouncycastle.asn1.x509.Extension;
import org.bouncycastle.asn1.x509.GeneralName;
import org.bouncycastle.asn1.x509.GeneralNames;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignerDigestMismatchException;
import org.bouncycastle.cms.SignerInformation;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Confere o PDF assinado que o médico anexa a um documento emitido. Cobre
 * qualquer assinador que grave a assinatura PAdES/CMS dentro do PDF — é o que
 * fazem os aplicativos dos certificados em nuvem (VIDaaS, BirdID, SafeID,
 * RemoteID, NeoID), o assinador do gov.br, o Assinador Serpro e o Adobe com
 * token A1/A3.
 *
 * <p>O que é conferido aqui: que o PDF é deste documento (o código de
 * verificação impresso na folha está no texto), que tem ao menos uma
 * assinatura, e que cada assinatura bate criptograficamente com o conteúdo
 * que ela cobre (o arquivo não foi alterado depois de assinado). O nível
 * (ICP-Brasil, gov.br) é lido dos nomes do certificado e da cadeia que vem
 * dentro da assinatura — <b>não</b> é a validação da cadeia até a raiz da
 * ICP-Brasil, que fica com o validador oficial do ITI (a tela leva até ele).
 */
public final class PdfSignatureInspector {

    /** OID do "otherName" ICP-Brasil com nascimento + CPF do titular (e-CPF). */
    private static final ASN1ObjectIdentifier ICP_BRASIL_PF_DATA = new ASN1ObjectIdentifier("2.16.76.1.3.1");

    private static final BouncyCastleProvider PROVIDER = new BouncyCastleProvider();

    /** CN de um e-CPF: "FULANO DE TAL:12345678909". */
    private static final Pattern CN_WITH_CPF = Pattern.compile("^(.*?):(\\d{11})$");

    private PdfSignatureInspector() {
    }

    /**
     * @param expectedCode o código de verificação do documento, que tem que
     *                     aparecer no texto do PDF
     * @throws InvalidSignedPdfException com a mensagem para o médico, quando o
     *                                   arquivo não serve
     */
    public static SignatureInspection inspect(byte[] pdf, String expectedCode) {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            if (!containsCode(document, expectedCode)) {
                throw new InvalidSignedPdfException("Este PDF não é deste documento: o código de verificação "
                        + format(expectedCode) + " não aparece nele.");
            }

            List<PDSignature> signatures = new ArrayList<>(document.getSignatureDictionaries());
            if (signatures.isEmpty()) {
                throw new InvalidSignedPdfException(
                        "Este PDF não tem assinatura digital. Assine o arquivo no seu assinador e anexe a versão assinada.");
            }
            // A mais recente é a que cobre mais bytes.
            signatures.sort(Comparator.comparingLong(PdfSignatureInspector::coveredUntil));

            SignerData last = null;
            for (PDSignature signature : signatures) {
                last = verify(signature, pdf);
            }
            PDSignature lastSignature = signatures.get(signatures.size() - 1);
            boolean coversDocument = coveredUntil(lastSignature) == pdf.length;

            Instant signedAt = last.signedAt();
            if (signedAt == null && lastSignature.getSignDate() != null) {
                signedAt = lastSignature.getSignDate().toInstant();
            }
            return new SignatureInspection(last.name(), last.cpf(), last.issuer(), last.level(), signedAt,
                    signatures.size(), coversDocument);
        } catch (IOException e) {
            throw new InvalidSignedPdfException("Não consegui ler o arquivo como PDF.");
        }
    }

    /** "AB12CD34" → "AB12-CD34", como sai impresso. */
    public static String format(String code) {
        return code.length() == 8 ? code.substring(0, 4) + "-" + code.substring(4) : code;
    }

    private static boolean containsCode(PDDocument document, String expectedCode) throws IOException {
        String text = new PDFTextStripper().getText(document);
        String normalized = text.replaceAll("[\\s\\-‐‑–]", "").toUpperCase(Locale.ROOT);
        return normalized.contains(expectedCode.toUpperCase(Locale.ROOT));
    }

    private static long coveredUntil(PDSignature signature) {
        int[] range = signature.getByteRange();
        return range == null || range.length < 4 ? 0 : (long) range[2] + range[3];
    }

    private record SignerData(String name, String cpf, String issuer, SignatureLevel level, Instant signedAt) {
    }

    private static SignerData verify(PDSignature signature, byte[] pdf) throws IOException {
        byte[] contents = signature.getContents(pdf);
        byte[] signedContent = signature.getSignedContent(pdf);
        try {
            CMSSignedData cms = new CMSSignedData(new CMSProcessableByteArray(signedContent), contents);
            Collection<SignerInformation> signers = cms.getSignerInfos().getSigners();
            if (signers.isEmpty()) {
                throw new InvalidSignedPdfException("A assinatura do PDF está vazia.");
            }
            SignerInformation signer = signers.iterator().next();
            @SuppressWarnings("unchecked")
            Collection<X509CertificateHolder> matches = cms.getCertificates().getMatches(signer.getSID());
            if (matches.isEmpty()) {
                throw new InvalidSignedPdfException("A assinatura não traz o certificado de quem assinou.");
            }
            X509CertificateHolder cert = matches.iterator().next();
            if (!signer.verify(new JcaSimpleSignerInfoVerifierBuilder().setProvider(PROVIDER).build(cert))) {
                throw tampered();
            }

            @SuppressWarnings("unchecked")
            Collection<X509CertificateHolder> chain = cms.getCertificates().getMatches(null);
            String[] nameAndCpf = nameAndCpf(cert);
            return new SignerData(nameAndCpf[0], nameAndCpf[1], cert.getIssuer().toString(), level(cert, chain),
                    signingTime(signer));
        } catch (InvalidSignedPdfException e) {
            throw e;
        } catch (CMSSignerDigestMismatchException e) {
            throw tampered();
        } catch (Exception e) {
            throw new InvalidSignedPdfException(
                    "Não consegui conferir a assinatura deste PDF (formato não reconhecido).");
        }
    }

    private static InvalidSignedPdfException tampered() {
        return new InvalidSignedPdfException(
                "A assinatura não confere com o conteúdo: o PDF foi alterado depois de assinado.");
    }

    private static SignatureLevel level(X509CertificateHolder cert, Collection<X509CertificateHolder> chain) {
        StringBuilder names = new StringBuilder(cert.getSubject().toString()).append('|').append(cert.getIssuer());
        for (X509CertificateHolder c : chain) {
            names.append('|').append(c.getSubject()).append('|').append(c.getIssuer());
        }
        String all = names.toString().toLowerCase(Locale.ROOT);
        if (all.contains("icp-brasil")) return SignatureLevel.ICP_BRASIL;
        if (all.contains("governo federal") || all.contains("gov-br") || all.contains("gov.br")) {
            return SignatureLevel.GOV_BR;
        }
        return SignatureLevel.OUTRA;
    }

    /** [nome, cpf] — o CPF vem do CN do e-CPF ou, sem ele lá, do "otherName" ICP-Brasil. */
    private static String[] nameAndCpf(X509CertificateHolder cert) {
        X500Name subject = cert.getSubject();
        RDN[] cns = subject.getRDNs(BCStyle.CN);
        String cn = cns.length > 0 ? IETFUtils.valueToString(cns[0].getFirst().getValue()) : subject.toString();
        String name = cn;
        String cpf = null;
        Matcher m = CN_WITH_CPF.matcher(cn.trim());
        if (m.matches()) {
            name = m.group(1).trim();
            cpf = m.group(2);
        }
        if (cpf == null) cpf = cpfFromAltName(cert);
        return new String[] {name, cpf};
    }

    private static String cpfFromAltName(X509CertificateHolder cert) {
        Extension san = cert.getExtension(Extension.subjectAlternativeName);
        if (san == null) return null;
        try {
            for (GeneralName gn : GeneralNames.getInstance(san.getParsedValue()).getNames()) {
                if (gn.getTagNo() != GeneralName.otherName) continue;
                ASN1Sequence seq = ASN1Sequence.getInstance(gn.getName());
                if (!ICP_BRASIL_PF_DATA.equals(ASN1ObjectIdentifier.getInstance(seq.getObjectAt(0)))) continue;
                String value = asText(ASN1TaggedObject.getInstance(seq.getObjectAt(1)).getBaseObject());
                // nascimento (ddmmaaaa) + CPF (11 dígitos) + …
                if (value != null && value.length() >= 19 && value.substring(8, 19).matches("\\d{11}")) {
                    return value.substring(8, 19);
                }
            }
        } catch (RuntimeException ignored) {
            // SAN fora do padrão: fica sem CPF; o resto da conferência vale.
        }
        return null;
    }

    private static String asText(ASN1Encodable encodable) {
        ASN1Primitive primitive = encodable.toASN1Primitive();
        if (primitive instanceof ASN1TaggedObject tagged) primitive = tagged.getBaseObject().toASN1Primitive();
        if (primitive instanceof ASN1OctetString octets) {
            return new String(octets.getOctets(), StandardCharsets.ISO_8859_1);
        }
        if (primitive instanceof ASN1String string) return string.getString();
        return null;
    }

    private static Instant signingTime(SignerInformation signer) {
        if (signer.getSignedAttributes() == null) return null;
        Attribute attr = signer.getSignedAttributes().get(CMSAttributes.signingTime);
        if (attr == null || attr.getAttrValues().size() == 0) return null;
        try {
            return Time.getInstance(attr.getAttrValues().getObjectAt(0)).getDate().toInstant();
        } catch (Exception e) {
            return null;
        }
    }
}
