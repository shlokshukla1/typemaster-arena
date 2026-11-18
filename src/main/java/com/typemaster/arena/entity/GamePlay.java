package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** One finished game by anyone (guests included) - used for traffic and game-popularity stats. */
@Entity
@Table(name = "game_plays", indexes = @Index(name = "idx_plays_time", columnList = "played_at"))
public class GamePlay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    @Column(name = "visitor_id", length = 64)
    private String visitorId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    public GamePlay() { }

    public GamePlay(GameType gameType, String visitorId, Long userId, LocalDateTime playedAt) {
        this.gameType = gameType;
        this.visitorId = visitorId;
        this.userId = userId;
        this.playedAt = playedAt;
    }

    public Long getId() { return id; }
    public GameType getGameType() { return gameType; }
    public String getVisitorId() { return visitorId; }
    public Long getUserId() { return userId; }
    public LocalDateTime getPlayedAt() { return playedAt; }
}
