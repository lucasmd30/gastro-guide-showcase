package com.gastroguide.availability.dto;

import com.gastroguide.availability.AvailabilityBlock;

import java.time.LocalDate;
import java.time.LocalTime;

public record AvailabilityBlockDto(String id, LocalDate startDate, LocalDate endDate, LocalTime startTime,
        LocalTime endTime, String reason) {

    public static AvailabilityBlockDto from(AvailabilityBlock block) {
        return new AvailabilityBlockDto(block.getId().toString(), block.getStartDate(), block.getEndDate(),
                block.getStartTime(), block.getEndTime(), block.getReason());
    }
}
