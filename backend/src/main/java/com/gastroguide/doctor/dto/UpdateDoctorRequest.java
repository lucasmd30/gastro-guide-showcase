package com.gastroguide.doctor.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateDoctorRequest(@NotBlank String name, String phone) {
}
