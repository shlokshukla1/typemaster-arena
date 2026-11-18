package com.typemaster.arena.dto;

public record LeaderboardDto(int rank, String username, double bestWpm, double bestAccuracy,
                             int highestRacingScore, int levelsCompleted, long totalScore, int gamesPlayed) { }
