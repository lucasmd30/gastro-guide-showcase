package com.gastroguide.document;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorCrm;
import com.gastroguide.doctor.DoctorCrmRepository;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.doctor.DoctorRqe;
import com.gastroguide.doctor.DoctorRqeRepository;
import com.gastroguide.document.dto.CreateMedicalDocumentRequest;
import com.gastroguide.document.dto.MedicalDocumentDto;
import com.gastroguide.document.dto.MedicalDocumentSignatureDto;
import com.gastroguide.document.signature.InvalidSignedPdfException;
import com.gastroguide.document.signature.MedicalDocumentSignature;
import com.gastroguide.document.signature.MedicalDocumentSignatureRepository;
import com.gastroguide.document.signature.PdfSignatureInspector;
import com.gastroguide.document.signature.SignatureInspection;
import com.gastroguide.patient.Patient;
import com.gastroguide.patient.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Documentos médicos do paciente. Só listar, ler e emitir: documento emitido
 * é definitivo (decisão do usuário, 14/10/2026), então não existe update nem
 * delete aqui — de propósito, para não haver caminho nenhum que o altere.
 *
 * <p>O PDF assinado digitalmente é anexado à parte (ver
 * {@link #attachSignedPdf}): não muda o documento, só guarda a cópia assinada.
 */
@Service
public class MedicalDocumentService {

    private final MedicalDocumentRepository repository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorCrmRepository doctorCrmRepository;
    private final DoctorRqeRepository doctorRqeRepository;
    private final MedicalDocumentSignatureRepository signatureRepository;

    /** PDF de documento de uma ou duas páginas tem centenas de KB; 8 MB sobra. */
    static final int MAX_SIGNED_PDF_BYTES = 8 * 1024 * 1024;

    public MedicalDocumentService(MedicalDocumentRepository repository, PatientRepository patientRepository,
                                  DoctorRepository doctorRepository, DoctorCrmRepository doctorCrmRepository,
                                  DoctorRqeRepository doctorRqeRepository,
                                  MedicalDocumentSignatureRepository signatureRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.doctorCrmRepository = doctorCrmRepository;
        this.doctorRqeRepository = doctorRqeRepository;
        this.signatureRepository = signatureRepository;
    }

    @Transactional(readOnly = true)
    public List<MedicalDocumentDto> list(UUID doctorId, UUID patientId) {
        findPatientOrThrow(doctorId, patientId);
        List<MedicalDocument> documents = repository.findByPatientIdOrderByIssuedAtDesc(patientId);
        Set<UUID> signed = documents.isEmpty() ? Set.of()
                : new HashSet<>(signatureRepository.findSignedIds(documents.stream().map(MedicalDocument::getId).toList()));
        return documents.stream()
                .map(d -> MedicalDocumentDto.from(d, signed.contains(d.getId()), null))
                .toList();
    }

    @Transactional(readOnly = true)
    public MedicalDocumentDto get(UUID doctorId, UUID patientId, UUID documentId) {
        MedicalDocument document = findDocumentOrThrow(doctorId, patientId, documentId);
        MedicalDocumentSignatureDto signature = signatureRepository.findInfoByDocumentId(documentId)
                .map(MedicalDocumentSignatureDto::from)
                .orElse(null);
        return MedicalDocumentDto.from(document, signature != null, signature);
    }

    /**
     * Anexa o PDF do documento assinado no assinador do médico. Recusa com 400
     * o que não serve — PDF de outro documento, sem assinatura, ou alterado
     * depois de assinado —, com a mensagem pronta para a tela. Anexar de novo
     * substitui o anterior.
     */
    @Transactional
    public MedicalDocumentDto attachSignedPdf(UUID doctorId, UUID patientId, UUID documentId, byte[] pdf,
                                              String fileName) {
        MedicalDocument document = findDocumentOrThrow(doctorId, patientId, documentId);
        if (pdf == null || pdf.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha o PDF assinado.");
        }
        if (pdf.length > MAX_SIGNED_PDF_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O PDF passa de 8 MB.");
        }
        if (!new String(pdf, 0, Math.min(pdf.length, 1024), StandardCharsets.ISO_8859_1).contains("%PDF-")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo não é um PDF.");
        }

        SignatureInspection inspection;
        try {
            inspection = PdfSignatureInspector.inspect(pdf, document.getVerificationCode());
        } catch (InvalidSignedPdfException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        MedicalDocumentSignature signature = signatureRepository.findById(documentId)
                .orElseGet(() -> new MedicalDocumentSignature(documentId));
        signature.replace(pdf, cleanFileName(fileName), sha256(pdf), inspection);
        signatureRepository.save(signature);
        return get(doctorId, patientId, documentId);
    }

    /** O PDF assinado, para baixar. 404 se ainda não foi anexado. */
    @Transactional(readOnly = true)
    public MedicalDocumentSignature signedPdf(UUID doctorId, UUID patientId, UUID documentId) {
        findDocumentOrThrow(doctorId, patientId, documentId);
        return signatureRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Este documento ainda não tem PDF assinado."));
    }

    private MedicalDocument findDocumentOrThrow(UUID doctorId, UUID patientId, UUID documentId) {
        findPatientOrThrow(doctorId, patientId);
        return repository.findByIdAndPatientId(documentId, patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento não encontrado."));
    }

    private static String cleanFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) return null;
        String name = fileName.replaceAll("[\\\\/\\r\\n\"]", "_").trim();
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Transactional
    public MedicalDocumentDto create(UUID doctorId, UUID patientId, CreateMedicalDocumentRequest request) {
        Patient patient = findPatientOrThrow(doctorId, patientId);
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Sessão inválida, faça login novamente."));

        // CRM/RQE escolhidos na emissão e congelados no documento, como no
        // registro de prontuário: trocar o principal depois não muda o que já
        // foi assinado.
        DoctorCrm crm = doctorCrmRepository.findByIdAndDoctorId(request.crmId(), doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "CRM inválido."));
        DoctorRqe rqe = null;
        if (request.rqeId() != null) {
            rqe = doctorRqeRepository.findByIdAndDoctorId(request.rqeId(), doctorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "RQE inválido."));
        }

        // Só os campos preenchidos: o formulário manda o mapa inteiro.
        Map<String, Object> data = new LinkedHashMap<>();
        if (request.data() != null) {
            request.data().forEach((key, value) -> {
                if (value != null && !value.isBlank()) data.put(key, value.trim());
            });
        }

        String model = request.model() == null || request.model().isBlank() ? null : request.model().trim();
        MedicalDocument document = new MedicalDocument(patient, doctor, request.kind(), model,
                request.title().trim(), request.content().strip(), data.isEmpty() ? null : data,
                crm.getCrm(), crm.getCrmUf(),
                rqe == null ? null : rqe.getRqe(), rqe == null ? null : rqe.getSpecialty());
        repository.save(document);
        return MedicalDocumentDto.from(document, false, null);
    }

    private Patient findPatientOrThrow(UUID doctorId, UUID patientId) {
        return patientRepository.findByIdAndDoctorId(patientId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
    }
}
