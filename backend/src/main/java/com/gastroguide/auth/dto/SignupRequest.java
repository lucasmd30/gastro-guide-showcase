package com.gastroguide.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "A senha deve ter ao menos 8 caracteres.") String password,
        @NotBlank String crm,
        @NotBlank @Size(min = 2, max = 2, message = "UF do CRM deve ter 2 letras.") String crmUf,
        String rqe,
        String specialty,
        String phone) {
}
