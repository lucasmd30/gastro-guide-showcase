package com.gastroguide.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * CRM não tem dígito verificador (ao contrário do CPF) — é só um número
 * sequencial atribuído por cada conselho regional. Aqui validamos apenas
 * formato (só dígitos, tamanho plausível) e que a UF é uma das 27 unidades
 * federativas reais.
 */
public final class CrmValidator {

    private static final Pattern CRM_PATTERN = Pattern.compile("^\\d{4,7}$");

    private static final Set<String> VALID_UFS = Set.of(
            "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
            "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO");

    private CrmValidator() {
    }

    /**
     * @return o CRM normalizado (só os dígitos, sem pontuação).
     */
    public static String normalize(String crm) {
        return crm == null ? "" : crm.replaceAll("[^0-9]", "");
    }

    /** UF brasileira válida (sigla em maiúsculas) — também usada no endereço comercial. */
    public static boolean isValidUf(String uf) {
        return VALID_UFS.contains(uf);
    }

    public static void validate(String normalizedCrm, String crmUf) {
        if (!CRM_PATTERN.matcher(normalizedCrm).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CRM deve conter só números (4 a 7 dígitos).");
        }
        if (!VALID_UFS.contains(crmUf)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UF do CRM inválida.");
        }
    }
}
