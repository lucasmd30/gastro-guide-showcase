package com.gastroguide.availability;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Uma faixa contínua de atendimento num dia da semana, dentro de uma
 * {@link AvailabilityWindow} — a janela em que o consultório abre. A grade
 * num dia é a soma das faixas de todas as janelas que contêm esse dia,
 * menos o que os {@link AvailabilityBlock bloqueios} fecham.
 *
 * <p>Os horários são <b>locais</b> (ver {@link AvailabilityService#ZONE}),
 * não instantes: "toda terça às 08:00" continua sendo 08:00 do consultório
 * independentemente de horário de verão.
 */
@Entity
@Table(name = "doctor_availability_rules")
public class AvailabilityRule {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "window_id", nullable = false)
    private AvailabilityWindow window;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DayOfWeek weekday;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AvailabilityRule() {
    }

    public AvailabilityRule(AvailabilityWindow window, DayOfWeek weekday, LocalTime startTime, LocalTime endTime) {
        this.doctor = window.getDoctor();
        this.window = window;
        this.weekday = weekday;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public void setWeekday(DayOfWeek weekday) {
        this.weekday = weekday;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public AvailabilityWindow getWindow() {
        return window;
    }

    public DayOfWeek getWeekday() {
        return weekday;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

}
