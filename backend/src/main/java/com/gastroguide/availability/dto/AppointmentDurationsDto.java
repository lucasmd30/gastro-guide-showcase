package com.gastroguide.availability.dto;

import com.gastroguide.doctor.Doctor;

/**
 * Quanto dura cada tipo de atendimento, em minutos, e o valor padrão do
 * particular de cada um, em centavos (nulo = sem valor padrão).
 */
public record AppointmentDurationsDto(int firstVisitMinutes, int followUpMinutes, Integer firstVisitPriceCents,
        Integer followUpPriceCents) {

    public static AppointmentDurationsDto from(Doctor doctor) {
        return new AppointmentDurationsDto(doctor.getFirstVisitMinutes(), doctor.getFollowUpMinutes(),
                doctor.getFirstVisitPriceCents(), doctor.getFollowUpPriceCents());
    }
}
