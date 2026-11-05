package com.gastroguide.availability.dto;

import com.gastroguide.availability.AvailabilityWindow;

import java.time.LocalDate;
import java.util.List;

public record AvailabilityWindowDto(String id, LocalDate startDate, LocalDate endDate,
        List<AvailabilityRuleDto> rules) {

    public static AvailabilityWindowDto from(AvailabilityWindow window) {
        return new AvailabilityWindowDto(window.getId().toString(), window.getStartDate(), window.getEndDate(),
                window.getRules().stream().map(AvailabilityRuleDto::from).toList());
    }
}
