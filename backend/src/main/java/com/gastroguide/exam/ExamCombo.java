package com.gastroguide.exam;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Combo de exames que o médico salvou para reusar ("Meus combos"). */
@Entity
@Table(name = "exam_combos")
public class ExamCombo {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false, length = 100)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "items_json", nullable = false, columnDefinition = "jsonb")
    private List<String> items;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExamCombo() {
    }

    public ExamCombo(Doctor doctor, String name, List<String> items) {
        this.doctor = doctor;
        this.name = name;
        this.items = items;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void update(String newName, List<String> newItems) {
        this.name = newName;
        this.items = newItems;
    }

    public UUID getId() {
        return id;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public String getName() {
        return name;
    }

    public List<String> getItems() {
        return items;
    }
}
