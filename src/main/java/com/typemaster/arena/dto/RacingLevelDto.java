package com.typemaster.arena.dto;

import com.typemaster.arena.entity.RacingLevel;

public record RacingLevelDto(int level, String name, double aiSpeed, int distance, String wordPool,
                             double mistakePenalty, String theme, String challenge) {
    public static RacingLevelDto from(RacingLevel l) {
        return new RacingLevelDto(l.getLevelNumber(), l.getName(), l.getAiSpeed(), l.getDistanceMeters(),
                l.getWordPool(), l.getMistakePenalty(), l.getTheme(), l.getChallenge());
    }
}
