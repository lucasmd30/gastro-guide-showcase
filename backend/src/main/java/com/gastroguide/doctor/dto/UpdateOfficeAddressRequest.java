package com.gastroguide.doctor.dto;

import jakarta.validation.constraints.Size;

/**
 * Substitui o endereço comercial inteiro: campo ausente ou em branco fica
 * vazio. CEP aceita pontuação ("01310-100"); UF é validada no service.
 */
public record UpdateOfficeAddressRequest(
        @Size(max = 12) String cep,
        @Size(max = 200) String street,
        @Size(max = 20) String number,
        @Size(max = 100) String complement,
        @Size(max = 120) String district,
        @Size(max = 120) String city,
        @Size(max = 2) String state) {
}
