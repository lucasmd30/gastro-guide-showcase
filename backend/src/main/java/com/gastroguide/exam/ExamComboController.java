package com.gastroguide.exam;

import com.gastroguide.exam.dto.ExamComboDto;
import com.gastroguide.exam.dto.ExamPreferencesDto;
import com.gastroguide.exam.dto.SaveExamComboRequest;
import com.gastroguide.exam.dto.SetExamFavoriteRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Sob /api/medicos/**, que já é só do médico no SecurityConfig. */
@RestController
@RequestMapping("/api/medicos/me/combos-exames")
public class ExamComboController {

    private final ExamComboService service;

    public ExamComboController(ExamComboService service) {
        this.service = service;
    }

    @GetMapping
    public ExamPreferencesDto preferences(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return service.preferences(doctorId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExamComboDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                               @Valid @RequestBody SaveExamComboRequest request) {
        return service.create(doctorId, request);
    }

    @PutMapping("/{comboId}")
    public ExamComboDto update(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                               @PathVariable UUID comboId,
                               @Valid @RequestBody SaveExamComboRequest request) {
        return service.update(doctorId, comboId, request);
    }

    @DeleteMapping("/{comboId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                       @PathVariable UUID comboId) {
        service.delete(doctorId, comboId);
    }

    /** Devolve a lista de favoritos já atualizada. */
    @PutMapping("/favoritos")
    public List<String> setFavorite(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                    @Valid @RequestBody SetExamFavoriteRequest request) {
        return service.setFavorite(doctorId, request);
    }
}
