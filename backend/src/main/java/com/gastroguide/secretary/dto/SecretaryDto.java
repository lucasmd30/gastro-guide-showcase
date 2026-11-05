package com.gastroguide.secretary.dto;

import com.gastroguide.secretary.Secretary;

public record SecretaryDto(String id, String name, String email, String doctorId) {
    public static SecretaryDto from(Secretary secretary) {
        return new SecretaryDto(
                secretary.getId().toString(),
                secretary.getName(),
                secretary.getEmail(),
                secretary.getDoctor().getId().toString());
    }
}
