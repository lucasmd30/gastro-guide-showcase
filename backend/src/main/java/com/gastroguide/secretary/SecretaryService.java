package com.gastroguide.secretary;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.secretary.dto.CreateSecretaryRequest;
import com.gastroguide.secretary.dto.ResetSecretaryPasswordRequest;
import com.gastroguide.secretary.dto.SecretaryDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class SecretaryService {

    private final SecretaryRepository secretaryRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecretaryRefreshTokenRepository refreshTokenRepository;

    public SecretaryService(SecretaryRepository secretaryRepository, DoctorRepository doctorRepository,
                             PasswordEncoder passwordEncoder, SecretaryRefreshTokenRepository refreshTokenRepository) {
        this.secretaryRepository = secretaryRepository;
        this.doctorRepository = doctorRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public List<SecretaryDto> list(UUID doctorId) {
        return secretaryRepository.findByDoctorIdOrderByCreatedAtAsc(doctorId).stream()
                .map(SecretaryDto::from)
                .toList();
    }

    @Transactional
    public SecretaryDto create(UUID doctorId, CreateSecretaryRequest request) {
        String email = request.email().trim().toLowerCase();
        if (secretaryRepository.existsByEmail(email) || doctorRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com esse e-mail.");
        }

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));

        Secretary secretary = new Secretary(
                doctor, request.name().trim(), email, passwordEncoder.encode(request.password()));
        secretary = secretaryRepository.save(secretary);

        return SecretaryDto.from(secretary);
    }

    /**
     * O médico define uma senha nova para a secretária — antes, esquecer a
     * senha dela obrigava a excluir a conta e criar outra. As sessões abertas
     * dela caem junto (os refresh tokens são apagados — ver
     * deleteAllForSecretary), como numa troca de senha comum; o access token
     * ainda vale até expirar, mesmo tradeoff da exclusão.
     */
    @Transactional
    public void resetPassword(UUID doctorId, UUID secretaryId, ResetSecretaryPasswordRequest request) {
        Secretary target = secretaryRepository.findByIdAndDoctorId(secretaryId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Secretária não encontrada."));
        target.setPasswordHash(passwordEncoder.encode(request.password()));
        refreshTokenRepository.deleteAllForSecretary(target.getId());
    }

    @Transactional
    public void delete(UUID doctorId, UUID secretaryId) {
        Secretary target = secretaryRepository.findByIdAndDoctorId(secretaryId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Secretária não encontrada."));
        secretaryRepository.delete(target);
    }
}
