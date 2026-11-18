package com.typemaster.arena.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;

/** Result of one race. Also used (as a list) to sync guest progress after login. */
public record RaceResultRequest(
        @Min(1) @Max(200) int level,
        boolean won,
        @Min(0) @Max(3) int stars,
        @PositiveOrZero int score,
        @PositiveOrZero @Max(400) double wpm,
        @DecimalMin("0") @DecimalMax("100") double accuracy,
        @PositiveOrZero double timeSeconds) { }
