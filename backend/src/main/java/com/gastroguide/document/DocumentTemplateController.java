package com.gastroguide.document;

import com.gastroguide.document.dto.DocumentTemplateDto;
import com.gastroguide.document.dto.SaveDocumentTemplateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Sob /api/medicos/**, que já é só do médico no SecurityConfig. */
@RestController
@RequestMapping("/api/medicos/me/modelos-documento")
public class DocumentTemplateController {

    private final DocumentTemplateService service;

    public DocumentTemplateController(DocumentTemplateService service) {
        this.service = service;
    }

    @GetMapping
    public List<DocumentTemplateDto> list(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return service.list(doctorId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentTemplateDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                      @Valid @RequestBody SaveDocumentTemplateRequest request) {
        return service.create(doctorId, request);
    }

    @PutMapping("/{templateId}")
    public DocumentTemplateDto update(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                      @PathVariable UUID templateId,
                                      @Valid @RequestBody SaveDocumentTemplateRequest request) {
        return service.update(doctorId, templateId, request);
    }

    @DeleteMapping("/{templateId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                       @PathVariable UUID templateId) {
        service.delete(doctorId, templateId);
    }
}
