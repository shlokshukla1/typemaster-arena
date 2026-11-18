package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Denormalised leaderboard row (one per user), refreshed whenever the user submits a score. */
@Entity
@Table(name = "leaderboard", indexes = {
        @Index(name = "idx_lb_wpm", columnList = "best_wpm"),
        @Index(name = "idx_lb_total", columnList = "total_score")
})
public class LeaderboardEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "best_wpm", nullable = false)
    private double bestWpm;

    @Column(name = "best_accuracy", nullable = false)
    private double bestAccuracy;

    @Column(name = "highest_racing_score", nullable = false)
    private int highestRacingScore;

    @Column(name = "levels_completed", nullable = false)
    private int levelsCompleted;

    @Column(name = "total_score", nullable = false)
    private long totalScore;

    @Column(name = "games_played", nullable = false)
    private int gamesPlayed;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public double getBestWpm() { return bestWpm; }
    public void setBestWpm(double bestWpm) { this.bestWpm = bestWpm; }
    public double getBestAccuracy() { return bestAccuracy; }
    public void setBestAccuracy(double bestAccuracy) { this.bestAccuracy = bestAccuracy; }
    public int getHighestRacingScore() { return highestRacingScore; }
    public void setHighestRacingScore(int v) { this.highestRacingScore = v; }
    public int getLevelsCompleted() { return levelsCompleted; }
    public void setLevelsCompleted(int levelsCompleted) { this.levelsCompleted = levelsCompleted; }
    public long getTotalScore() { return totalScore; }
    public void setTotalScore(long totalScore) { this.totalScore = totalScore; }
    public int getGamesPlayed() { return gamesPlayed; }
    public void setGamesPlayed(int gamesPlayed) { this.gamesPlayed = gamesPlayed; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
