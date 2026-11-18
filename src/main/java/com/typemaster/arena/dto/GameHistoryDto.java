package com.typemaster.arena.dto;

import com.typemaster.arena.entity.GameHistory;

import java.time.LocalDateTime;

public record GameHistoryDto(Long id, String gameType, String outcome, int score, double wpm, double accuracy,
                             double netWpm, int correctChars, int incorrectChars, int wordsTyped,
                             double durationSeconds, Integer level, LocalDateTime playedAt) {
    public static GameHistoryDto from(GameHistory h) {
        return new GameHistoryDto(h.getId(), h.getGameType().name(), h.getOutcome(), h.getScore(), h.getWpm(),
                h.getAccuracy(), h.getNetWpm(), h.getCorrectChars(), h.getIncorrectChars(), h.getWordsTyped(),
                h.getDurationSeconds(), h.getLevel(), h.getPlayedAt());
    }
}
