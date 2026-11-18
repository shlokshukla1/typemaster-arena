package com.typemaster.arena.service;

import com.typemaster.arena.dto.LevelProgressDto;
import com.typemaster.arena.dto.RaceResultRequest;
import com.typemaster.arena.dto.RacingLevelDto;
import com.typemaster.arena.entity.RacingLevel;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.entity.UserLevelProgress;
import com.typemaster.arena.exception.ApiException;
import com.typemaster.arena.exception.ResourceNotFoundException;
import com.typemaster.arena.repository.RacingLevelRepository;
import com.typemaster.arena.repository.UserLevelProgressRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * AI Car Racing level logic. Level 1 is always unlocked; winning level N unlocks level N+1.
 * A locked level cannot be submitted (HTTP 403), so progress can only advance one level at a time.
 */
@Service
public class RacingService {

    private final RacingLevelRepository levelRepository;
    private final UserLevelProgressRepository progressRepository;
    private final LeaderboardService leaderboardService;

    public RacingService(RacingLevelRepository levelRepository, UserLevelProgressRepository progressRepository,
                         LeaderboardService leaderboardService) {
        this.levelRepository = levelRepository;
        this.progressRepository = progressRepository;
        this.leaderboardService = leaderboardService;
    }

    @Transactional(readOnly = true)
    public List<RacingLevelDto> levels() {
        return levelRepository.findAllByOrderByLevelNumberAsc().stream().map(RacingLevelDto::from).toList();
    }

    /** Progress for every level (levels without a row are reported as locked, except level 1). */
    @Transactional(readOnly = true)
    public List<LevelProgressDto> progress(User user) {
        Map<Integer, UserLevelProgress> byLevel = new HashMap<>();
        for (UserLevelProgress p : progressRepository.findByUser(user)) {
            byLevel.put(p.getLevel().getLevelNumber(), p);
        }
        List<LevelProgressDto> out = new ArrayList<>();
        for (RacingLevel level : levelRepository.findAllByOrderByLevelNumberAsc()) {
            UserLevelProgress p = byLevel.get(level.getLevelNumber());
            if (p != null) {
                out.add(LevelProgressDto.from(p));
            } else {
                out.add(new LevelProgressDto(level.getLevelNumber(), level.getLevelNumber() == 1, false, 0, 0, 0, 0, null, 0));
            }
        }
        return out;
    }

    /** Records one race result and unlocks the next level on a win. */
    @Transactional
    public List<LevelProgressDto> recordResult(User user, RaceResultRequest req) {
        apply(user, req, true);
        return progress(user);
    }

    /**
     * Merges guest (localStorage) progress into the account after login.
     * Results are applied in level order; results for levels that are still locked are skipped.
     */
    @Transactional
    public List<LevelProgressDto> sync(User user, List<RaceResultRequest> results) {
        results.stream()
                .sorted(Comparator.comparingInt(RaceResultRequest::level))
                .forEach(r -> apply(user, r, false));
        return progress(user);
    }

    private void apply(User user, RaceResultRequest req, boolean strict) {
        RacingLevel level = levelRepository.findByLevelNumber(req.level())
                .orElseThrow(() -> new ResourceNotFoundException("Racing level " + req.level() + " does not exist"));
        UserLevelProgress p = getOrCreate(user, level);
        if (!p.isUnlocked()) {
            if (strict) throw new ApiException(HttpStatus.FORBIDDEN, "Level " + req.level() + " is locked. Win the previous level first.");
            return;
        }
        p.setAttempts(p.getAttempts() + 1);
        if (req.won()) {
            p.setCompleted(true);
            p.setStars(Math.max(p.getStars(), Math.max(1, req.stars())));
            p.setBestScore(Math.max(p.getBestScore(), req.score()));
            p.setBestWpm(Math.max(p.getBestWpm(), req.wpm()));
            p.setBestAccuracy(Math.max(p.getBestAccuracy(), req.accuracy()));
            if (req.timeSeconds() > 0 && (p.getBestTimeSeconds() == null || req.timeSeconds() < p.getBestTimeSeconds())) {
                p.setBestTimeSeconds(req.timeSeconds());
            }
            levelRepository.findByLevelNumber(req.level() + 1).ifPresent(next -> {
                UserLevelProgress np = getOrCreate(user, next);
                if (!np.isUnlocked()) {
                    np.setUnlocked(true);
                    progressRepository.save(np);
                }
            });
        }
        progressRepository.save(p);
        leaderboardService.updateLevelsCompleted(user, progressRepository.countByUserAndCompletedTrue(user));
    }

    private UserLevelProgress getOrCreate(User user, RacingLevel level) {
        return progressRepository.findByUserAndLevel(user, level).orElseGet(() -> {
            UserLevelProgress p = new UserLevelProgress();
            p.setUser(user);
            p.setLevel(level);
            p.setUnlocked(level.getLevelNumber() == 1);
            return progressRepository.save(p);
        });
    }
}
