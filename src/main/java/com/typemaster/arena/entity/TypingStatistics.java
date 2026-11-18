package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Lifetime typing totals for one user (one row per user). */
@Entity
@Table(name = "typing_statistics")
public class TypingStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_games", nullable = false)
    private int totalGames;

    @Column(name = "total_words", nullable = false)
    private long totalWords;

    @Column(name = "total_correct_chars", nullable = false)
    private long totalCorrectChars;

    @Column(name = "total_incorrect_chars", nullable = false)
    private long totalIncorrectChars;

    @Column(name = "total_time_seconds", nullable = false)
    private long totalTimeSeconds;

    /** Sum of the gross WPM of every game, used to compute the average. */
    @Column(name = "wpm_sum", nullable = false)
    private double wpmSum;

    @Column(name = "best_wpm", nullable = false)
    private double bestWpm;

    @Column(name = "best_net_wpm", nullable = false)
    private double bestNetWpm;

    @Column(name = "best_accuracy", nullable = false)
    private double bestAccuracy;

    @Column(name = "best_score", nullable = false)
    private int bestScore;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    void touch() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public int getTotalGames() { return totalGames; }
    public void setTotalGames(int totalGames) { this.totalGames = totalGames; }
    public long getTotalWords() { return totalWords; }
    public void setTotalWords(long totalWords) { this.totalWords = totalWords; }
    public long getTotalCorrectChars() { return totalCorrectChars; }
    public void setTotalCorrectChars(long v) { this.totalCorrectChars = v; }
    public long getTotalIncorrectChars() { return totalIncorrectChars; }
    public void setTotalIncorrectChars(long v) { this.totalIncorrectChars = v; }
    public long getTotalTimeSeconds() { return totalTimeSeconds; }
    public void setTotalTimeSeconds(long v) { this.totalTimeSeconds = v; }
    public double getWpmSum() { return wpmSum; }
    public void setWpmSum(double wpmSum) { this.wpmSum = wpmSum; }
    public double getBestWpm() { return bestWpm; }
    public void setBestWpm(double bestWpm) { this.bestWpm = bestWpm; }
    public double getBestNetWpm() { return bestNetWpm; }
    public void setBestNetWpm(double bestNetWpm) { this.bestNetWpm = bestNetWpm; }
    public double getBestAccuracy() { return bestAccuracy; }
    public void setBestAccuracy(double bestAccuracy) { this.bestAccuracy = bestAccuracy; }
    public int getBestScore() { return bestScore; }
    public void setBestScore(int bestScore) { this.bestScore = bestScore; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
