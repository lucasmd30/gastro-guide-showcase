package com.gastroguide.medicalrecord;

import com.gastroguide.medicalrecord.dto.CreateMedicalRecordRequest;
import com.gastroguide.medicalrecord.dto.MedicalRecordDetailDto;
import com.gastroguide.medicalrecord.dto.MedicalRecordSummaryDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pacientes/{patientId}/prontuario")
public class MedicalRecordController {

    private final MedicalRecordService service;

    public MedicalRecordController(MedicalRecordService service) {
        this.service = service;
    }

    @GetMapping
    public List<MedicalRecordSummaryDto> list(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID patientId) {
        return service.list(doctorId, patientId);
    }

    @GetMapping("/{recordId}")
    public MedicalRecordDetailDto get(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID patientId,
                                       @PathVariable UUID recordId) {
        return service.getById(doctorId, patientId, recordId);
    }

    @PostMapping
    public MedicalRecordDetailDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID patientId,
                                          @Valid @RequestBody CreateMedicalRecordRequest request) {
        return service.create(doctorId, patientId, request);
    }

    @DeleteMapping("/{recordId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID patientId,
                        @PathVariable UUID recordId) {
        service.delete(doctorId, patientId, recordId);
    }
}
