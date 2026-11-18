package com.typemaster.arena.service;

import com.typemaster.arena.dto.ScoreRequest;
import com.typemaster.arena.dto.ScoreResponse;
import com.typemaster.arena.entity.*;
import com.typemaster.arena.exception.ApiException;
import com.typemaster.arena.repository.GameHistoryRepository;
import com.typemaster.arena.repository.GameScoreRepository;
import com.typemaster.arena.repository.TypingStatisticsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

/**
 * Saves a finished game: writes game_scores + game_history and updates
 * typing_statistics and the leaderboard in one transaction.
 */
@Service
public class ScoreService {

    private static final Set<String> OUTCOMES = Set.of("WIN", "LOSS", "COMPLETED");

    private final GameScoreRepository scoreRepository;
    private final GameHistoryRepository historyRepository;
    private final TypingStatisticsRepository statsRepository;
    private final StatisticsService statisticsService;
    private final LeaderboardService leaderboardService;

    public ScoreService(GameScoreRepository scoreRepository, GameHistoryRepository historyRepository,
                        TypingStatisticsRepository statsRepository, StatisticsService statisticsService,
                        LeaderboardService leaderboardService) {
        this.scoreRepository = scoreRepository;
        this.historyRepository = historyRepository;
        this.statsRepository = statsRepository;
        this.statisticsService = statisticsService;
        this.leaderboardService = leaderboardService;
    }

    /** Parses "falling", "speed", "racing" ... into a {@link GameType}. */
    public static GameType parseGameType(String raw) {
        try {
            return GameType.valueOf(raw.trim().toUpperCase(Locale.ROOT).replace('-', '_'));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown game type: " + raw);
        }
    }

    @Transactional
    public ScoreResponse submit(User user, ScoreRequest req) {
        GameType type = parseGameType(req.gameType());
        String outcome = req.outcome() == null ? "COMPLETED" : req.outcome().toUpperCase(Locale.ROOT);
        if (!OUTCOMES.contains(outcome)) outcome = "COMPLETED";

        // Server-side recomputation of net WPM using the documented formula: Net = Gross x Accuracy / 100.
        double netWpm = req.wpm() * req.accuracy() / 100.0;

        GameScore score = new GameScore();
        score.setUser(user);
        score.setGameType(type);
        score.setScore(req.score());
        score.setWpm(req.wpm());
        score.setAccuracy(req.accuracy());
        score.setNetWpm(netWpm);
        score.setLevel(req.level());
        scoreRepository.save(score);

        GameHistory h = new GameHistory();
        h.setUser(user);
        h.setGameType(type);
        h.setOutcome(outcome);
        h.setScore(req.score());
        h.setWpm(req.wpm());
        h.setAccuracy(req.accuracy());
        h.setNetWpm(netWpm);
        h.setCorrectChars(req.correctChars());
        h.setIncorrectChars(req.incorrectChars());
        h.setWordsTyped(req.wordsTyped());
        h.setDurationSeconds(req.durationSeconds());
        h.setLevel(req.level());
        historyRepository.save(h);

        TypingStatistics s = statisticsService.statsEntity(user);
        boolean bestWpm = req.wpm() > s.getBestWpm();
        boolean bestScore = req.score() > s.getBestScore();
        s.setTotalGames(s.getTotalGames() + 1);
        s.setTotalWords(s.getTotalWords() + req.wordsTyped());
        s.setTotalCorrectChars(s.getTotalCorrectChars() + req.correctChars());
        s.setTotalIncorrectChars(s.getTotalIncorrectChars() + req.incorrectChars());
        s.setTotalTimeSeconds(s.getTotalTimeSeconds() + Math.round(req.durationSeconds()));
        s.setWpmSum(s.getWpmSum() + req.wpm());
        s.setBestWpm(Math.max(s.getBestWpm(), req.wpm()));
        s.setBestNetWpm(Math.max(s.getBestNetWpm(), netWpm));
        int typed = req.correctChars() + req.incorrectChars();
        if (typed >= 30) s.setBestAccuracy(Math.max(s.getBestAccuracy(), req.accuracy()));
        s.setBestScore(Math.max(s.getBestScore(), req.score()));
        statsRepository.save(s);

        leaderboardService.recordGame(user, req.score(), req.wpm(), req.accuracy(), typed, type == GameType.RACING);

        return new ScoreResponse(score.getId(), bestWpm, bestScore, statisticsService.statsFor(user));
    }
}
