package com.gastroguide.exam.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SaveExamComboRequest(
        @NotBlank @Size(max = 100) String name,
        @NotEmpty @Size(max = 300) List<@NotBlank @Size(max = 300) String> items) {
}
