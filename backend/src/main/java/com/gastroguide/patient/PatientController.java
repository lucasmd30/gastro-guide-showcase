package com.gastroguide.patient;

import com.gastroguide.patient.dto.PatientDto;
import com.gastroguide.patient.dto.PatientPageDto;
import com.gastroguide.patient.dto.PatientRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/pacientes")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    /**
     * @param q busca por nome, CPF, telefone ou e-mail. CPF pode vir pontuado.
     * @param page página (base 0)
     * @param size itens por página, limitado a 100 no service
     */
    @GetMapping
    public PatientPageDto list(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                @AuthenticationPrincipal(expression = "role") String role,
                                @RequestParam(required = false) String q,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "20") int size) {
        return patientService.list(doctorId, isDoctor(role), q, page, size);
    }

    @GetMapping("/{patientId}")
    public PatientDto get(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                           @AuthenticationPrincipal(expression = "role") String role,
                           @PathVariable UUID patientId) {
        return patientService.getById(doctorId, patientId, isDoctor(role));
    }

    @PostMapping
    public PatientDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                              @AuthenticationPrincipal(expression = "role") String role,
                              @Valid @RequestBody PatientRequest request) {
        return patientService.create(doctorId, request, isDoctor(role));
    }

    @PutMapping("/{patientId}")
    public PatientDto update(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                              @AuthenticationPrincipal(expression = "role") String role,
                              @PathVariable UUID patientId,
                              @Valid @RequestBody PatientRequest request) {
        return patientService.update(doctorId, patientId, request, isDoctor(role));
    }

    @DeleteMapping("/{patientId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID patientId) {
        patientService.delete(doctorId, patientId);
    }

    private static boolean isDoctor(String role) {
        return !"SECRETARIA".equals(role);
    }
}
