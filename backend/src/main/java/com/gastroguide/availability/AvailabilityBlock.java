package com.gastroguide.availability;

import com.gastroguide.doctor.Doctor;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Um fechamento de agenda (férias, congresso, folga), modelo iClinic:
 * um período de dias e, opcionalmente, uma faixa de horas que vale em
 * <b>cada</b> dia do período. Horas nulas = dia inteiro. Tira do ar o que
 * qualquer janela abriria ali; não mexe em agendamento já marcado.
 */
@Entity
@Table(name = "doctor_availability_blocks")
public class AvailabilityBlock {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(length = 200)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AvailabilityBlock() {
    }

    public AvailabilityBlock(Doctor doctor, LocalDate startDate, LocalDate endDate, LocalTime startTime,
            LocalTime endTime, String reason) {
        this.doctor = doctor;
        this.startDate = startDate;
        this.endDate = endDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.reason = reason;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    /**
     * O bloqueio alcança um atendimento que começa nesse dia e hora locais
     * e dura {@code durationMin}? Compara o intervalo inteiro, não só o
     * início: uma reunião das 14:00 às 16:00 também derruba a consulta das
     * 13:45, que invadiria as 14:00.
     */
    public boolean blocks(LocalDate day, LocalTime start, int durationMin) {
        if (day.isBefore(startDate) || day.isAfter(endDate)) {
            return false;
        }
        if (startTime == null) {
            return true;
        }
        int startMinute = start.toSecondOfDay() / 60;
        int endMinute = startMinute + durationMin;
        return startMinute < endTime.toSecondOfDay() / 60 && startTime.toSecondOfDay() / 60 < endMinute;
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public String getReason() {
        return reason;
    }
}
