package com.gastroguide.exam;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Combo marcado com estrela. Guardado pelo nome, porque os combos prontos do
 * catálogo não existem no banco.
 */
@Entity
@Table(name = "exam_combo_favorites")
public class ExamComboFavorite {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "combo_name", nullable = false, length = 100)
    private String comboName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ExamComboFavorite() {
    }

    public ExamComboFavorite(Doctor doctor, String comboName) {
        this.doctor = doctor;
        this.comboName = comboName;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public String getComboName() {
        return comboName;
    }

    public void rename(String newName) {
        this.comboName = newName;
    }
}
