package com.gastroguide.document;

import com.gastroguide.document.dto.CreateMedicalDocumentRequest;
import com.gastroguide.document.dto.MedicalDocumentDto;
import com.gastroguide.document.signature.MedicalDocumentSignature;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Só o médico: está nos matchers ROLE_DOCTOR do SecurityConfig, porque
 * atestado e relatório podem levar CID e dado clínico. Sem PUT nem DELETE —
 * documento emitido é definitivo; o PDF assinado vai à parte, em
 * {@code /assinatura}.
 */
@RestController
@RequestMapping("/api/pacientes/{patientId}/documentos")
public class MedicalDocumentController {

    private final MedicalDocumentService service;

    public MedicalDocumentController(MedicalDocumentService service) {
        this.service = service;
    }

    @GetMapping
    public List<MedicalDocumentDto> list(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                         @PathVariable UUID patientId) {
        return service.list(doctorId, patientId);
    }

    @GetMapping("/{documentId}")
    public MedicalDocumentDto get(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                  @PathVariable UUID patientId, @PathVariable UUID documentId) {
        return service.get(doctorId, patientId, documentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicalDocumentDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                     @PathVariable UUID patientId,
                                     @Valid @RequestBody CreateMedicalDocumentRequest request) {
        return service.create(doctorId, patientId, request);
    }

    /**
     * Anexa o PDF assinado digitalmente (multipart, campo {@code file}). Não
     * mexe no documento: guarda a cópia assinada ao lado dele.
     */
    @PostMapping(path = "/{documentId}/assinatura", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MedicalDocumentDto attachSignedPdf(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                              @PathVariable UUID patientId, @PathVariable UUID documentId,
                                              @RequestPart("file") MultipartFile file) throws IOException {
        return service.attachSignedPdf(doctorId, patientId, documentId, file.getBytes(),
                file.getOriginalFilename());
    }

    @GetMapping("/{documentId}/assinatura/pdf")
    public ResponseEntity<byte[]> signedPdf(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                            @PathVariable UUID patientId, @PathVariable UUID documentId) {
        MedicalDocumentSignature signature = service.signedPdf(doctorId, patientId, documentId);
        String fileName = signature.getFileName() != null ? signature.getFileName() : "documento-assinado.pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName, StandardCharsets.UTF_8).build().toString())
                .body(signature.getPdf());
    }
}
