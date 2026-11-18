package com.typemaster.arena.dto;

/** Returned after saving a score. */
public record ScoreResponse(Long scoreId, boolean newPersonalBestWpm, boolean newPersonalBestScore, StatsDto stats) { }
