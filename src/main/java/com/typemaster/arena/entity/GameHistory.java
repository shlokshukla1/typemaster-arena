package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Full log of every finished game session of a registered user (shown on "My Progress"). */
@Entity
@Table(name = "game_history", indexes = @Index(name = "idx_history_user_time", columnList = "user_id, played_at"))
public class GameHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    /** WIN, LOSS or COMPLETED. */
    @Column(nullable = false, length = 20)
    private String outcome;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private double wpm;

    @Column(nullable = false)
    private double accuracy;

    @Column(name = "net_wpm", nullable = false)
    private double netWpm;

    @Column(name = "correct_chars", nullable = false)
    private int correctChars;

    @Column(name = "incorrect_chars", nullable = false)
    private int incorrectChars;

    @Column(name = "words_typed", nullable = false)
    private int wordsTyped;

    @Column(name = "duration_seconds", nullable = false)
    private double durationSeconds;

    private Integer level;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    @PrePersist
    void onCreate() {
        if (playedAt == null) playedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public GameType getGameType() { return gameType; }
    public void setGameType(GameType gameType) { this.gameType = gameType; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public double getWpm() { return wpm; }
    public void setWpm(double wpm) { this.wpm = wpm; }
    public double getAccuracy() { return accuracy; }
    public void setAccuracy(double accuracy) { this.accuracy = accuracy; }
    public double getNetWpm() { return netWpm; }
    public void setNetWpm(double netWpm) { this.netWpm = netWpm; }
    public int getCorrectChars() { return correctChars; }
    public void setCorrectChars(int correctChars) { this.correctChars = correctChars; }
    public int getIncorrectChars() { return incorrectChars; }
    public void setIncorrectChars(int incorrectChars) { this.incorrectChars = incorrectChars; }
    public int getWordsTyped() { return wordsTyped; }
    public void setWordsTyped(int wordsTyped) { this.wordsTyped = wordsTyped; }
    public double getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(double durationSeconds) { this.durationSeconds = durationSeconds; }
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    public LocalDateTime getPlayedAt() { return playedAt; }
}
