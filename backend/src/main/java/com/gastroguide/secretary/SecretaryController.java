package com.gastroguide.secretary;

import com.gastroguide.secretary.dto.CreateSecretaryRequest;
import com.gastroguide.secretary.dto.ResetSecretaryPasswordRequest;
import com.gastroguide.secretary.dto.SecretaryDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medicos/me/secretarias")
public class SecretaryController {

    private final SecretaryService secretaryService;

    public SecretaryController(SecretaryService secretaryService) {
        this.secretaryService = secretaryService;
    }

    @GetMapping
    public List<SecretaryDto> list(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return secretaryService.list(doctorId);
    }

    @PostMapping
    public SecretaryDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                @Valid @RequestBody CreateSecretaryRequest request) {
        return secretaryService.create(doctorId, request);
    }

    @PutMapping("/{secretaryId}/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                               @PathVariable UUID secretaryId,
                               @Valid @RequestBody ResetSecretaryPasswordRequest request) {
        secretaryService.resetPassword(doctorId, secretaryId, request);
    }

    @DeleteMapping("/{secretaryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                        @PathVariable UUID secretaryId) {
        secretaryService.delete(doctorId, secretaryId);
    }
}
