package com.gastroguide.exam.dto;

import com.gastroguide.exam.ExamCombo;

import java.util.List;

public record ExamComboDto(String id, String name, List<String> items) {

    public static ExamComboDto from(ExamCombo combo) {
        return new ExamComboDto(combo.getId().toString(), combo.getName(), combo.getItems());
    }
}
