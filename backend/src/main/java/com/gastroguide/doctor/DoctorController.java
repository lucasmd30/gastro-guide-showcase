package com.gastroguide.doctor;

import com.gastroguide.doctor.dto.AddCrmRequest;
import com.gastroguide.doctor.dto.AddHealthPlanRequest;
import com.gastroguide.doctor.dto.AddRqeRequest;
import com.gastroguide.doctor.dto.DoctorDto;
import com.gastroguide.doctor.dto.DoctorHealthPlanDto;
import com.gastroguide.doctor.dto.UpdateDoctorRequest;
import com.gastroguide.doctor.dto.UpdateOfficeAddressRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medicos")
public class DoctorController {

    private final DoctorService doctorService;
    private final DoctorHealthPlanService healthPlanService;

    public DoctorController(DoctorService doctorService, DoctorHealthPlanService healthPlanService) {
        this.doctorService = doctorService;
        this.healthPlanService = healthPlanService;
    }

    /** Convênios atendidos — o que o link de consulta oferece a quem escolhe convênio. */
    @GetMapping("/me/convenios")
    public List<DoctorHealthPlanDto> listHealthPlans(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return healthPlanService.list(doctorId);
    }

    @PostMapping("/me/convenios")
    public List<DoctorHealthPlanDto> addHealthPlan(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @Valid @RequestBody AddHealthPlanRequest request) {
        return healthPlanService.add(doctorId, request.name());
    }

    @DeleteMapping("/me/convenios/{planId}")
    public List<DoctorHealthPlanDto> removeHealthPlan(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID planId) {
        return healthPlanService.remove(doctorId, planId);
    }

    @GetMapping("/me")
    public DoctorDto me(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return doctorService.getById(doctorId);
    }

    @PutMapping("/me")
    public DoctorDto updateMe(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @Valid @RequestBody UpdateDoctorRequest request) {
        return doctorService.update(doctorId, request);
    }

    @PutMapping("/me/endereco")
    public DoctorDto updateOfficeAddress(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                         @Valid @RequestBody UpdateOfficeAddressRequest request) {
        return doctorService.updateOfficeAddress(doctorId, request);
    }

    @PostMapping("/me/crms")
    public DoctorDto addCrm(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @Valid @RequestBody AddCrmRequest request) {
        return doctorService.addCrm(doctorId, request);
    }

    @DeleteMapping("/me/crms/{crmId}")
    public DoctorDto removeCrm(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID crmId) {
        return doctorService.removeCrm(doctorId, crmId);
    }

    @PutMapping("/me/crms/{crmId}/principal")
    public DoctorDto setPrincipalCrm(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID crmId) {
        return doctorService.setPrincipalCrm(doctorId, crmId);
    }

    @PostMapping("/me/rqes")
    public DoctorDto addRqe(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @Valid @RequestBody AddRqeRequest request) {
        return doctorService.addRqe(doctorId, request);
    }

    @DeleteMapping("/me/rqes/{rqeId}")
    public DoctorDto removeRqe(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID rqeId) {
        return doctorService.removeRqe(doctorId, rqeId);
    }

    @PutMapping("/me/rqes/{rqeId}/principal")
    public DoctorDto setPrincipalRqe(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId, @PathVariable UUID rqeId) {
        return doctorService.setPrincipalRqe(doctorId, rqeId);
    }
}
