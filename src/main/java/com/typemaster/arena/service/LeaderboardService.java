package com.typemaster.arena.service;

import com.typemaster.arena.dto.LeaderboardDto;
import com.typemaster.arena.entity.LeaderboardEntry;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.repository.LeaderboardRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** Maintains the denormalised leaderboard table and serves the top-N lists. */
@Service
public class LeaderboardService {

    private final LeaderboardRepository leaderboardRepository;

    public LeaderboardService(LeaderboardRepository leaderboardRepository) {
        this.leaderboardRepository = leaderboardRepository;
    }

    /** Returns (creating if needed) the leaderboard row of a user. */
    @Transactional
    public LeaderboardEntry entryFor(User user) {
        return leaderboardRepository.findByUser(user).orElseGet(() -> {
            LeaderboardEntry e = new LeaderboardEntry();
            e.setUser(user);
            return leaderboardRepository.save(e);
        });
    }

    /** Applies a finished game to the user's leaderboard row. */
    @Transactional
    public void recordGame(User user, int score, double wpm, double accuracy, int typedChars, boolean racing) {
        LeaderboardEntry e = entryFor(user);
        e.setGamesPlayed(e.getGamesPlayed() + 1);
        e.setTotalScore(e.getTotalScore() + score);
        e.setBestWpm(Math.max(e.getBestWpm(), wpm));
        // Only count accuracy for games with a meaningful amount of typing (avoids 100% from 3 keystrokes).
        if (typedChars >= 30) e.setBestAccuracy(Math.max(e.getBestAccuracy(), accuracy));
        if (racing) e.setHighestRacingScore(Math.max(e.getHighestRacingScore(), score));
        leaderboardRepository.save(e);
    }

    @Transactional
    public void updateLevelsCompleted(User user, int levelsCompleted) {
        LeaderboardEntry e = entryFor(user);
        e.setLevelsCompleted(levelsCompleted);
        leaderboardRepository.save(e);
    }

    /**
     * Top players.
     * @param sortBy wpm | accuracy | racing | levels | score
     */
    @Transactional(readOnly = true)
    public List<LeaderboardDto> top(String sortBy, int limit) {
        Sort sort = switch (sortBy == null ? "wpm" : sortBy.toLowerCase()) {
            case "accuracy" -> Sort.by(Sort.Order.desc("bestAccuracy"), Sort.Order.desc("bestWpm"));
            case "racing" -> Sort.by(Sort.Order.desc("highestRacingScore"), Sort.Order.desc("levelsCompleted"));
            case "levels" -> Sort.by(Sort.Order.desc("levelsCompleted"), Sort.Order.desc("highestRacingScore"));
            case "score" -> Sort.by(Sort.Order.desc("totalScore"));
            default -> Sort.by(Sort.Order.desc("bestWpm"), Sort.Order.desc("bestAccuracy"));
        };
        List<LeaderboardEntry> rows = leaderboardRepository.findActive(PageRequest.of(0, Math.min(Math.max(limit, 1), 100), sort));
        List<LeaderboardDto> out = new ArrayList<>();
        int rank = 1;
        for (LeaderboardEntry e : rows) {
            out.add(new LeaderboardDto(rank++, e.getUser().getUsername(), round1(e.getBestWpm()),
                    round1(e.getBestAccuracy()), e.getHighestRacingScore(), e.getLevelsCompleted(),
                    e.getTotalScore(), e.getGamesPlayed()));
        }
        return out;
    }

    static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
