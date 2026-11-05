package com.gastroguide.availability.dto;

import com.gastroguide.availability.AvailabilityRule;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record AvailabilityRuleDto(String id, DayOfWeek weekday, LocalTime startTime, LocalTime endTime) {

    public static AvailabilityRuleDto from(AvailabilityRule rule) {
        return new AvailabilityRuleDto(rule.getId().toString(), rule.getWeekday(), rule.getStartTime(),
                rule.getEndTime());
    }
}
