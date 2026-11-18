package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Per-user state of one racing level: unlocked / completed / stars / best results. */
@Entity
@Table(name = "user_level_progress",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_level", columnNames = {"user_id", "level_id"}))
public class UserLevelProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "level_id", nullable = false)
    private RacingLevel level;

    @Column(nullable = false)
    private boolean unlocked;

    @Column(nullable = false)
    private boolean completed;

    /** 0-3 stars, best ever. */
    @Column(nullable = false)
    private int stars;

    @Column(name = "best_score", nullable = false)
    private int bestScore;

    @Column(name = "best_wpm", nullable = false)
    private double bestWpm;

    @Column(name = "best_accuracy", nullable = false)
    private double bestAccuracy;

    /** Fastest winning time in seconds (null until first win). */
    @Column(name = "best_time_seconds")
    private Double bestTimeSeconds;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public RacingLevel getLevel() { return level; }
    public void setLevel(RacingLevel level) { this.level = level; }
    public boolean isUnlocked() { return unlocked; }
    public void setUnlocked(boolean unlocked) { this.unlocked = unlocked; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public int getStars() { return stars; }
    public void setStars(int stars) { this.stars = stars; }
    public int getBestScore() { return bestScore; }
    public void setBestScore(int bestScore) { this.bestScore = bestScore; }
    public double getBestWpm() { return bestWpm; }
    public void setBestWpm(double bestWpm) { this.bestWpm = bestWpm; }
    public double getBestAccuracy() { return bestAccuracy; }
    public void setBestAccuracy(double bestAccuracy) { this.bestAccuracy = bestAccuracy; }
    public Double getBestTimeSeconds() { return bestTimeSeconds; }
    public void setBestTimeSeconds(Double bestTimeSeconds) { this.bestTimeSeconds = bestTimeSeconds; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
