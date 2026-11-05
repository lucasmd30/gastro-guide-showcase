package com.gastroguide.auth;

import com.gastroguide.auth.dto.AuthResponse;
import com.gastroguide.auth.dto.SignupRequest;
import com.gastroguide.common.CrmValidator;
import com.gastroguide.common.MedicalSpecialties;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorCrm;
import com.gastroguide.doctor.DoctorCrmRepository;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.doctor.DoctorRqe;
import com.gastroguide.doctor.DoctorRqeRepository;
import com.gastroguide.doctor.dto.DoctorDto;
import com.gastroguide.secretary.SecretaryAuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    private final DoctorRepository doctorRepository;
    private final DoctorCrmRepository doctorCrmRepository;
    private final DoctorRqeRepository doctorRqeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenSecurityService refreshTokenSecurityService;
    private final SecretaryAuthService secretaryAuthService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Duration refreshTokenTtl;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
            DoctorRepository doctorRepository,
            DoctorCrmRepository doctorCrmRepository,
            DoctorRqeRepository doctorRqeRepository,
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenSecurityService refreshTokenSecurityService,
            SecretaryAuthService secretaryAuthService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${jwt.refresh-token-expiration-days}") long refreshTokenExpirationDays) {
        this.doctorRepository = doctorRepository;
        this.doctorCrmRepository = doctorCrmRepository;
        this.doctorRqeRepository = doctorRqeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenSecurityService = refreshTokenSecurityService;
        this.secretaryAuthService = secretaryAuthService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenTtl = Duration.ofDays(refreshTokenExpirationDays);
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase();
        if (doctorRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um médico com esse e-mail.");
        }
        if (secretaryAuthService.existsByEmail(email)) {
            // E-mail já usado por uma secretária de outro médico — sem essa
            // checagem, o cadastro criaria um médico com o mesmo e-mail e a
            // secretária ficaria com a conta permanentemente inacessível
            // (login passaria a resolver pro médico, nunca mais pra ela).
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com esse e-mail.");
        }

        String crm = CrmValidator.normalize(request.crm());
        String crmUf = request.crmUf().trim().toUpperCase();
        CrmValidator.validate(crm, crmUf);
        if (doctorCrmRepository.existsByCrmAndCrmUf(crm, crmUf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um médico cadastrado com esse CRM/UF.");
        }

        Doctor doctor = new Doctor(
                request.name().trim(),
                email,
                passwordEncoder.encode(request.password()),
                blankToNull(request.phone()));
        doctor = doctorRepository.save(doctor);
        doctorCrmRepository.save(new DoctorCrm(doctor, crm, crmUf, true));

        String rqe = blankToNull(request.rqe());
        String specialty = blankToNull(request.specialty());
        if (rqe != null && specialty != null) {
            MedicalSpecialties.validate(specialty);
            doctorRqeRepository.save(new DoctorRqe(doctor, rqe, specialty, true));
        }

        return issueTokens(doctor);
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        String normalized = email.trim().toLowerCase();
        Optional<Doctor> doctor = doctorRepository.findByEmail(normalized);
        if (doctor.isPresent()) {
            if (!passwordEncoder.matches(password, doctor.get().getPasswordHash())) {
                // Mensagem igual à de "e-mail não encontrado" — não revela se o
                // e-mail existe (mesma convenção usada no fluxo de secretária).
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
            }
            return issueTokens(doctor.get());
        }
        return secretaryAuthService.tryLogin(normalized, password)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos."));
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String tokenHash = hash(rawRefreshToken);
        Optional<RefreshToken> token = refreshTokenRepository.findByTokenHash(tokenHash);

        if (token.isEmpty()) {
            return secretaryAuthService.tryRefresh(tokenHash)
                    .orElseThrow(AuthService::unauthorizedSession);
        }

        RefreshToken refreshToken = token.get();
        if (refreshToken.isRevoked()) {
            // Um refresh token já usado (revogado) reaparecendo é sinal de roubo/replay:
            // derruba todas as sessões desse médico como precaução. Isso precisa
            // confirmar numa transação própria (REQUIRES_NEW) — senão o rollback
            // do throw abaixo desfaria a própria revogação de segurança.
            refreshTokenSecurityService.revokeAllForDoctorInNewTransaction(refreshToken.getDoctor().getId());
            throw unauthorizedSession();
        }
        if (refreshToken.isExpired()) {
            throw unauthorizedSession();
        }

        refreshToken.revoke();
        refreshTokenRepository.save(refreshToken);

        return issueTokens(refreshToken.getDoctor());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        String tokenHash = hash(rawRefreshToken);
        Optional<RefreshToken> token = refreshTokenRepository.findByTokenHash(tokenHash);
        if (token.isPresent()) {
            token.get().revoke();
            refreshTokenRepository.save(token.get());
            return;
        }
        secretaryAuthService.tryLogout(tokenHash);
    }

    private AuthResponse issueTokens(Doctor doctor) {
        String accessToken = jwtService.generateAccessToken(doctor.getId(), "DOCTOR", doctor.getId());
        String rawRefreshToken = generateRawRefreshToken();

        RefreshToken refreshToken = new RefreshToken(doctor, hash(rawRefreshToken), Instant.now().plus(refreshTokenTtl));
        refreshTokenRepository.save(refreshToken);

        List<DoctorCrm> crms = doctorCrmRepository.findByDoctorIdOrderByCreatedAtAsc(doctor.getId());
        List<DoctorRqe> rqes = doctorRqeRepository.findByDoctorIdOrderByCreatedAtAsc(doctor.getId());
        return new AuthResponse(accessToken, rawRefreshToken, "DOCTOR", DoctorDto.from(doctor, crms, rqes), null);
    }

    private static ResponseStatusException unauthorizedSession() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente.");
    }

    private String generateRawRefreshToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
