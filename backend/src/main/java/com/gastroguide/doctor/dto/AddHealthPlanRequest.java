package com.gastroguide.doctor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddHealthPlanRequest(@NotBlank @Size(max = 120) String name) {
}
