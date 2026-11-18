package com.typemaster.arena.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Response / request records used by the admin panel and the traffic tracker. */
public final class AdminDtos {

    private AdminDtos() { }

    /** Body of POST /api/track/* (visitorId is a random id the browser keeps in localStorage). */
    public record TrackRequest(String visitorId, String page, String gameType) { }

    /** Headline numbers for the admin dashboard. */
    public record Overview(
            long totalUsers, long newUsersToday, long newUsersLast7Days,
            long onlineNow, long visitorsToday, long pageViewsToday,
            long totalVisitors, long totalPageViews,
            long gamesToday, long totalGames, long activePlayersToday,
            long certificatesIssued, long savedScores, LocalDateTime generatedAt) { }

    /** One day of traffic. */
    public record TrafficDay(LocalDate day, long pageViews, long uniqueVisitors, long gamesPlayed, long newUsers) { }

    /** Plays per game (guests included). */
    public record GameStat(String gameType, long plays, long playsLast7Days) { }

    /** One row of the admin user table. */
    public record UserRow(
            Long id, String username, String email, String role,
            LocalDateTime joinedAt, LocalDateTime lastLoginAt, LocalDateTime lastPlayedAt,
            int gamesPlayed, double bestWpm, double bestAccuracy, long totalScore,
            int levelsCompleted, int highestLevel, int stars, boolean certificate) { }

    /** Full detail of one user. */
    public record UserDetail(UserRow user, StatsDto stats, List<LevelProgressDto> completedLevels,
                             List<GameHistoryDto> recentGames) { }

    /** Page of users. */
    public record UserPage(List<UserRow> content, int page, int size, long totalElements, int totalPages) { }
}
