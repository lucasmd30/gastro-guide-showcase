package com.gastroguide.doctor.dto;

import jakarta.validation.constraints.NotBlank;

public record AddRqeRequest(@NotBlank String rqe, @NotBlank String specialty) {
}
