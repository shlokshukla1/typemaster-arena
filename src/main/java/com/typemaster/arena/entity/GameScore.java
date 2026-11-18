package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** A single score submitted for one of the 10 games. Used for per-game best scores. */
@Entity
@Table(name = "game_scores", indexes = {
        @Index(name = "idx_scores_user", columnList = "user_id"),
        @Index(name = "idx_scores_game", columnList = "game_type")
})
public class GameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private double wpm;

    @Column(nullable = false)
    private double accuracy;

    @Column(name = "net_wpm", nullable = false)
    private double netWpm;

    /** Racing level (only for the racing game). */
    private Integer level;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public GameType getGameType() { return gameType; }
    public void setGameType(GameType gameType) { this.gameType = gameType; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public double getWpm() { return wpm; }
    public void setWpm(double wpm) { this.wpm = wpm; }
    public double getAccuracy() { return accuracy; }
    public void setAccuracy(double accuracy) { this.accuracy = accuracy; }
    public double getNetWpm() { return netWpm; }
    public void setNetWpm(double netWpm) { this.netWpm = netWpm; }
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
