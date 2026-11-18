package com.typemaster.arena.entity;

import jakarta.persistence.*;

/**
 * Definition of one AI Car Racing level (seeded at startup by {@code DataInitializer}).
 * The frontend contains an identical fallback table so the game also works offline.
 */
@Entity
@Table(name = "racing_levels")
public class RacingLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "level_number", nullable = false, unique = true)
    private int levelNumber;

    @Column(nullable = false, length = 60)
    private String name;

    /** AI opponent speed in meters per second (constant during the race). */
    @Column(name = "ai_speed", nullable = false)
    private double aiSpeed;

    /** Track length in meters. */
    @Column(name = "distance_meters", nullable = false)
    private int distanceMeters;

    /** Word pool: EASY, MEDIUM, HARD, EXPERT, CAPITALS, PUNCTUATION, NUMBERS, MIXED. */
    @Column(name = "word_pool", nullable = false, length = 20)
    private String wordPool;

    /** Meters the player loses for each wrong keystroke. */
    @Column(name = "mistake_penalty", nullable = false)
    private double mistakePenalty;

    /** Visual theme of the track: DAY, SUNSET, NIGHT, DESERT, SNOW, NEON. */
    @Column(nullable = false, length = 20)
    private String theme;

    @Column(name = "challenge", nullable = false, length = 200)
    private String challenge;

    public RacingLevel() { }

    public RacingLevel(int levelNumber, String name, double aiSpeed, int distanceMeters, String wordPool,
                       double mistakePenalty, String theme, String challenge) {
        this.levelNumber = levelNumber;
        this.name = name;
        this.aiSpeed = aiSpeed;
        this.distanceMeters = distanceMeters;
        this.wordPool = wordPool;
        this.mistakePenalty = mistakePenalty;
        this.theme = theme;
        this.challenge = challenge;
    }

    public Long getId() { return id; }
    public int getLevelNumber() { return levelNumber; }
    public void setLevelNumber(int levelNumber) { this.levelNumber = levelNumber; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getAiSpeed() { return aiSpeed; }
    public void setAiSpeed(double aiSpeed) { this.aiSpeed = aiSpeed; }
    public int getDistanceMeters() { return distanceMeters; }
    public void setDistanceMeters(int distanceMeters) { this.distanceMeters = distanceMeters; }
    public String getWordPool() { return wordPool; }
    public void setWordPool(String wordPool) { this.wordPool = wordPool; }
    public double getMistakePenalty() { return mistakePenalty; }
    public void setMistakePenalty(double mistakePenalty) { this.mistakePenalty = mistakePenalty; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public String getChallenge() { return challenge; }
    public void setChallenge(String challenge) { this.challenge = challenge; }
}
