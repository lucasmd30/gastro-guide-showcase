package com.gastroguide.exam.dto;

import java.util.List;

/** Tudo que a tela de solicitação de exames guarda por médico. */
public record ExamPreferencesDto(List<ExamComboDto> combos, List<String> favorites) {
}
