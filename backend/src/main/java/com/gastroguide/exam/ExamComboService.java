package com.gastroguide.exam;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.exam.dto.ExamComboDto;
import com.gastroguide.exam.dto.ExamPreferencesDto;
import com.gastroguide.exam.dto.SaveExamComboRequest;
import com.gastroguide.exam.dto.SetExamFavoriteRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

/** Combos próprios e favoritos da solicitação de exames — isolados por médico. */
@Service
public class ExamComboService {

    private final ExamComboRepository combos;
    private final ExamComboFavoriteRepository favorites;
    private final DoctorRepository doctorRepository;

    public ExamComboService(ExamComboRepository combos, ExamComboFavoriteRepository favorites,
                            DoctorRepository doctorRepository) {
        this.combos = combos;
        this.favorites = favorites;
        this.doctorRepository = doctorRepository;
    }

    @Transactional(readOnly = true)
    public ExamPreferencesDto preferences(UUID doctorId) {
        return new ExamPreferencesDto(
                combos.findByDoctorIdOrderByNameAsc(doctorId).stream().map(ExamComboDto::from).toList(),
                favoriteNames(doctorId));
    }

    @Transactional
    public ExamComboDto create(UUID doctorId, SaveExamComboRequest request) {
        String name = request.name().trim();
        if (combos.existsByDoctorIdAndNameIgnoreCase(doctorId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um combo com esse nome.");
        }
        ExamCombo combo = new ExamCombo(doctor(doctorId), name, cleanItems(request.items()));
        combos.save(combo);
        return ExamComboDto.from(combo);
    }

    @Transactional
    public ExamComboDto update(UUID doctorId, UUID comboId, SaveExamComboRequest request) {
        ExamCombo combo = findOrThrow(doctorId, comboId);
        String name = request.name().trim();
        if (combos.existsByDoctorIdAndNameIgnoreCaseAndIdNot(doctorId, name, comboId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um combo com esse nome.");
        }
        // A estrela acompanha o combo renomeado.
        if (!combo.getName().equals(name)) {
            boolean alreadyStarred = favorites.findByDoctorIdAndComboName(doctorId, name).isPresent();
            favorites.findByDoctorIdAndComboName(doctorId, combo.getName()).ifPresent(f -> {
                if (alreadyStarred) favorites.delete(f);
                else f.rename(name);
            });
        }
        combo.update(name, cleanItems(request.items()));
        combos.saveAndFlush(combo);
        return ExamComboDto.from(combo);
    }

    @Transactional
    public void delete(UUID doctorId, UUID comboId) {
        ExamCombo combo = findOrThrow(doctorId, comboId);
        favorites.findByDoctorIdAndComboName(doctorId, combo.getName()).ifPresent(favorites::delete);
        combos.delete(combo);
    }

    @Transactional
    public List<String> setFavorite(UUID doctorId, SetExamFavoriteRequest request) {
        String name = request.name().trim();
        var existing = favorites.findByDoctorIdAndComboName(doctorId, name);
        if (request.favorite() && existing.isEmpty()) {
            favorites.save(new ExamComboFavorite(doctor(doctorId), name));
        } else if (!request.favorite()) {
            existing.ifPresent(favorites::delete);
        }
        favorites.flush();
        return favoriteNames(doctorId);
    }

    private List<String> favoriteNames(UUID doctorId) {
        return favorites.findByDoctorIdOrderByComboNameAsc(doctorId).stream()
                .map(ExamComboFavorite::getComboName).toList();
    }

    /** Sem espaços nas pontas e sem repetidos, na ordem em que vieram. */
    private static List<String> cleanItems(List<String> items) {
        return List.copyOf(new LinkedHashSet<>(items.stream().map(String::trim).toList()));
    }

    private Doctor doctor(UUID doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Sessão inválida, faça login novamente."));
    }

    private ExamCombo findOrThrow(UUID doctorId, UUID comboId) {
        return combos.findByIdAndDoctorId(comboId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Combo não encontrado."));
    }
}
