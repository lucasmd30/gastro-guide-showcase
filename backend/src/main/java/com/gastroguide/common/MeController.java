package com.gastroguide.common;

import com.gastroguide.auth.JwtService;
import com.gastroguide.common.dto.MeDto;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.secretary.SecretaryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final DoctorRepository doctorRepository;
    private final SecretaryRepository secretaryRepository;

    public MeController(DoctorRepository doctorRepository, SecretaryRepository secretaryRepository) {
        this.doctorRepository = doctorRepository;
        this.secretaryRepository = secretaryRepository;
    }

    @GetMapping
    public MeDto me(@AuthenticationPrincipal JwtService.JwtPrincipal principal) {
        if ("SECRETARIA".equals(principal.role())) {
            var secretary = secretaryRepository.findById(principal.subjectId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));
            return new MeDto("SECRETARIA", secretary.getName(), secretary.getEmail(), secretary.getDoctor().getId().toString());
        }

        var doctor = doctorRepository.findById(principal.doctorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));
        return new MeDto("DOCTOR", doctor.getName(), doctor.getEmail(), null);
    }
}
