package com.gastroguide.doctor.dto;

import jakarta.validation.constraints.NotBlank;

public record AddCrmRequest(@NotBlank String crm, @NotBlank String crmUf) {
}
