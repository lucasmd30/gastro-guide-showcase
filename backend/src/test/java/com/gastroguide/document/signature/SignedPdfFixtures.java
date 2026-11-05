package com.gastroguide.document.signature;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;
import org.bouncycastle.util.CollectionStore;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

/** PDFs de teste, sem e com assinatura PAdES destacada feita com um certificado autoassinado. */
public final class SignedPdfFixtures {

    private static final KeyPair KEY_PAIR = generateKeys();

    private SignedPdfFixtures() {
    }

    private static KeyPair generateKeys() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static byte[] pdf(String text) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText(text);
                stream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public static byte[] signed(byte[] pdf, String subjectDn) {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            X500Name subject = new X500Name(subjectDn);
            ContentSigner contentSigner = new JcaContentSignerBuilder("SHA256withRSA").build(KEY_PAIR.getPrivate());
            X509CertificateHolder cert = new JcaX509v3CertificateBuilder(subject, BigInteger.ONE,
                    Date.from(Instant.now().minus(1, ChronoUnit.DAYS)), Date.from(Instant.now().plus(365, ChronoUnit.DAYS)),
                    subject, KEY_PAIR.getPublic()).build(contentSigner);

            PDSignature signature = new PDSignature();
            signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
            signature.setSubFilter(PDSignature.SUBFILTER_ETSI_CADES_DETACHED);
            signature.setSignDate(Calendar.getInstance());
            document.addSignature(signature, content -> {
                try {
                    CMSSignedDataGenerator generator = new CMSSignedDataGenerator();
                    generator.addSignerInfoGenerator(new JcaSignerInfoGeneratorBuilder(
                            new JcaDigestCalculatorProviderBuilder().build())
                            .build(new JcaContentSignerBuilder("SHA256withRSA").build(KEY_PAIR.getPrivate()), cert));
                    generator.addCertificates(new CollectionStore<>(List.of(cert)));
                    return generator.generate(new CMSProcessableByteArray(content.readAllBytes()), false).getEncoded();
                } catch (Exception e) {
                    throw new IOException(e);
                }
            });
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.saveIncremental(out);
            // saveIncremental grava o arquivo inteiro: o original + a assinatura.
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
