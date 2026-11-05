package com.gastroguide.availability;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Uma janela de atendimento: o período do calendário em que as faixas
 * semanais dela valem. {@code endDate} nulo é "até segunda ordem" — o
 * horário fixo dos outros produtos. Janelas podem se sobrepor; nesse caso
 * os horários se somam. Fora de qualquer janela, nada é oferecido.
 */
@Entity
@Table(name = "doctor_availability_windows")
public class AvailabilityWindow {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @OneToMany(mappedBy = "window", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("weekday ASC, startTime ASC")
    private List<AvailabilityRule> rules = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AvailabilityWindow() {
    }

    public AvailabilityWindow(Doctor doctor, LocalDate startDate, LocalDate endDate) {
        this.doctor = doctor;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    /** A janela contém o dia? Início inclusivo, fim inclusivo (ou aberto). */
    public boolean covers(LocalDate day) {
        return !day.isBefore(startDate) && (endDate == null || !day.isAfter(endDate));
    }

    /** As duas janelas têm pelo menos um dia em comum? */
    public boolean intersects(LocalDate otherStart, LocalDate otherEnd) {
        boolean startsBeforeOtherEnds = otherEnd == null || !startDate.isAfter(otherEnd);
        boolean otherStartsBeforeEnds = endDate == null || !otherStart.isAfter(endDate);
        return startsBeforeOtherEnds && otherStartsBeforeEnds;
    }

    public UUID getId() {
        return id;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public List<AvailabilityRule> getRules() {
        return rules;
    }
}
