package com.typemaster.arena.dto;

/** Public site-wide numbers shown on the homepage. */
public record GlobalStatsDto(int totalGamesAvailable, long registeredPlayers, long gamesPlayed,
                             double bestWpm, double bestAccuracy, int racingLevels) { }
