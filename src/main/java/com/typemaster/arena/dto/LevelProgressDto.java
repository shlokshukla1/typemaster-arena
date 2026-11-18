package com.typemaster.arena.dto;

import com.typemaster.arena.entity.UserLevelProgress;

public record LevelProgressDto(int level, boolean unlocked, boolean completed, int stars, int bestScore,
                               double bestWpm, double bestAccuracy, Double bestTime, int attempts) {
    public static LevelProgressDto from(UserLevelProgress p) {
        return new LevelProgressDto(p.getLevel().getLevelNumber(), p.isUnlocked(), p.isCompleted(), p.getStars(),
                p.getBestScore(), p.getBestWpm(), p.getBestAccuracy(), p.getBestTimeSeconds(), p.getAttempts());
    }
}
