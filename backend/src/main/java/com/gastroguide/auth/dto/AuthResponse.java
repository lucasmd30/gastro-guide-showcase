package com.gastroguide.auth.dto;

import com.gastroguide.doctor.dto.DoctorDto;
import com.gastroguide.secretary.dto.SecretaryDto;

public record AuthResponse(
        String accessToken, String refreshToken, String role, DoctorDto doctor, SecretaryDto secretary) {
}
