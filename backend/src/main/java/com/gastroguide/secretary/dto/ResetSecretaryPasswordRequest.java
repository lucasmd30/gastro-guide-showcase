package com.gastroguide.secretary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Mesma regra de senha do cadastro da secretária. */
public record ResetSecretaryPasswordRequest(
        @NotBlank @Size(min = 8, message = "A senha deve ter ao menos 8 caracteres.") String password) {
}
