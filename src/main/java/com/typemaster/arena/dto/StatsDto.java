package com.typemaster.arena.dto;

import java.util.Map;

/** Lifetime statistics of a user. bestPerGame maps game type -> best score. */
public record StatsDto(
        int totalGames,
        long totalWords,
        long correctChars,
        long incorrectChars,
        long totalTimeSeconds,
        double averageWpm,
        double bestWpm,
        double bestNetWpm,
        double bestAccuracy,
        double lifetimeAccuracy,
        int bestScore,
        int levelsCompleted,
        Map<String, Integer> bestPerGame) { }
