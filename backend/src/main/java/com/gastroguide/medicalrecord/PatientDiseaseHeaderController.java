package com.gastroguide.medicalrecord;

import com.gastroguide.medicalrecord.dto.PatientDiseaseHeaderDto;
import com.gastroguide.medicalrecord.dto.UpdateDiseaseHeaderRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/pacientes/{patientId}/cabecalhos")
public class PatientDiseaseHeaderController {

    private final PatientDiseaseHeaderService service;

    public PatientDiseaseHeaderController(PatientDiseaseHeaderService service) {
        this.service = service;
    }

    @GetMapping("/{disease}")
    public PatientDiseaseHeaderDto get(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                        @PathVariable UUID patientId,
                                        @PathVariable String disease) {
        return service.get(doctorId, patientId, disease)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cabeçalho ainda não preenchido."));
    }

    @PutMapping("/{disease}")
    public PatientDiseaseHeaderDto upsert(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                           @PathVariable UUID patientId,
                                           @PathVariable String disease,
                                           @RequestBody UpdateDiseaseHeaderRequest request) {
        return service.upsert(doctorId, patientId, disease, request);
    }
}
