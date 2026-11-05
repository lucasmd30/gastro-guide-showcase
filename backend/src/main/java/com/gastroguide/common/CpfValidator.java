package com.gastroguide.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * CPF tem dígito verificador (ao contrário do CRM) — validamos formato (11
 * dígitos, não todos iguais) e os 2 dígitos verificadores pelo algoritmo
 * oficial (soma ponderada mod 11).
 */
public final class CpfValidator {

    private CpfValidator() {
    }

    /**
     * @return o CPF normalizado (só os dígitos, sem pontuação).
     */
    public static String normalize(String cpf) {
        return cpf == null ? "" : cpf.replaceAll("[^0-9]", "");
    }

    public static void validate(String normalizedCpf) {
        if (!isValid(normalizedCpf)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido.");
        }
    }

    private static boolean isValid(String cpf) {
        if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) {
            return false;
        }

        int[] digits = cpf.chars().map(c -> c - '0').toArray();

        int firstCheck = checkDigit(digits, 9, 10);
        if (firstCheck != digits[9]) {
            return false;
        }

        int secondCheck = checkDigit(digits, 10, 11);
        return secondCheck == digits[10];
    }

    private static int checkDigit(int[] digits, int length, int firstWeight) {
        int sum = 0;
        for (int i = 0; i < length; i++) {
            sum += digits[i] * (firstWeight - i);
        }
        int remainder = 11 - (sum % 11);
        return remainder >= 10 ? 0 : remainder;
    }
}
