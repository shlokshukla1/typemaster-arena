package com.typemaster.arena.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Result of one finished game, sent by the frontend.
 * outcome is WIN / LOSS / COMPLETED (optional, defaults to COMPLETED); level is only used by racing.
 */
public record ScoreRequest(
        @NotBlank String gameType,
        @PositiveOrZero @Max(10_000_000) int score,
        @PositiveOrZero @Max(400) double wpm,
        @DecimalMin("0") @DecimalMax("100") double accuracy,
        @PositiveOrZero @Max(400) double netWpm,
        @PositiveOrZero int correctChars,
        @PositiveOrZero int incorrectChars,
        @PositiveOrZero int wordsTyped,
        @PositiveOrZero @Max(86_400) double durationSeconds,
        String outcome,
        Integer level) { }
