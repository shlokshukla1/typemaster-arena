package com.typemaster.arena.service;

import com.typemaster.arena.dto.GameHistoryDto;
import com.typemaster.arena.dto.GlobalStatsDto;
import com.typemaster.arena.dto.StatsDto;
import com.typemaster.arena.entity.GameType;
import com.typemaster.arena.entity.TypingStatistics;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

import static com.typemaster.arena.service.LeaderboardService.round1;

/** Lifetime per-user statistics, game history and site-wide numbers. */
@Service
public class StatisticsService {

    /** Number of playable games on the site (Practice mode is not counted). */
    public static final int GAMES_AVAILABLE = 10;

    private final TypingStatisticsRepository statsRepository;
    private final GameScoreRepository scoreRepository;
    private final GameHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final UserLevelProgressRepository progressRepository;
    private final RacingLevelRepository levelRepository;

    public StatisticsService(TypingStatisticsRepository statsRepository, GameScoreRepository scoreRepository,
                             GameHistoryRepository historyRepository, UserRepository userRepository,
                             UserLevelProgressRepository progressRepository, RacingLevelRepository levelRepository) {
        this.statsRepository = statsRepository;
        this.scoreRepository = scoreRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.progressRepository = progressRepository;
        this.levelRepository = levelRepository;
    }

    @Transactional
    public TypingStatistics statsEntity(User user) {
        return statsRepository.findByUser(user).orElseGet(() -> {
            TypingStatistics s = new TypingStatistics();
            s.setUser(user);
            return statsRepository.save(s);
        });
    }

    @Transactional(readOnly = true)
    public StatsDto statsFor(User user) {
        TypingStatistics s = statsRepository.findByUser(user).orElseGet(TypingStatistics::new);
        Map<String, Integer> bestPerGame = new LinkedHashMap<>();
        for (Object[] row : scoreRepository.bestPerGame(user)) {
            bestPerGame.put(((GameType) row[0]).name(), ((Number) row[1]).intValue());
        }
        long typed = s.getTotalCorrectChars() + s.getTotalIncorrectChars();
        double lifetimeAcc = typed == 0 ? 0 : 100.0 * s.getTotalCorrectChars() / typed;
        double avgWpm = s.getTotalGames() == 0 ? 0 : s.getWpmSum() / s.getTotalGames();
        return new StatsDto(s.getTotalGames(), s.getTotalWords(), s.getTotalCorrectChars(),
                s.getTotalIncorrectChars(), s.getTotalTimeSeconds(), round1(avgWpm), round1(s.getBestWpm()),
                round1(s.getBestNetWpm()), round1(s.getBestAccuracy()), round1(lifetimeAcc), s.getBestScore(),
                progressRepository.countByUserAndCompletedTrue(user), bestPerGame);
    }

    @Transactional(readOnly = true)
    public Page<GameHistoryDto> history(User user, int page, int size) {
        return historyRepository
                .findByUserOrderByPlayedAtDesc(user, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)))
                .map(GameHistoryDto::from);
    }

    @Transactional(readOnly = true)
    public GlobalStatsDto global() {
        return new GlobalStatsDto(GAMES_AVAILABLE, userRepository.count(), historyRepository.count(),
                round1(scoreRepository.globalBestWpm()), round1(scoreRepository.globalBestAccuracy()),
                (int) levelRepository.count());
    }
}
