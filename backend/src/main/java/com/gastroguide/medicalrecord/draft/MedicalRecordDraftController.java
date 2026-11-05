package com.gastroguide.medicalrecord.draft;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Sob {@code /api/pacientes/{id}/prontuario/**}: herda o gate ROLE_DOCTOR do
 * SecurityConfig — rascunho de prontuário é dado clínico, a secretária não vê.
 */
@RestController
@RequestMapping("/api/pacientes/{patientId}/prontuario/rascunhos/{formKey}")
public class MedicalRecordDraftController {

    private final MedicalRecordDraftService service;

    public MedicalRecordDraftController(MedicalRecordDraftService service) {
        this.service = service;
    }

    /** 204 quando não há rascunho — não é erro, é o caso comum. */
    @GetMapping
    public ResponseEntity<MedicalRecordDraftDto> get(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                                      @PathVariable UUID patientId, @PathVariable String formKey) {
        return service.get(doctorId, patientId, formKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public MedicalRecordDraftDto save(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                       @PathVariable UUID patientId, @PathVariable String formKey,
                                       @RequestBody Map<String, Object> data) {
        return service.save(doctorId, patientId, formKey, data);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                        @PathVariable UUID patientId, @PathVariable String formKey) {
        service.delete(doctorId, patientId, formKey);
    }
}
