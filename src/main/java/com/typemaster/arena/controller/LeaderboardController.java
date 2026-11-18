package com.typemaster.arena.controller;

import com.typemaster.arena.dto.LeaderboardDto;
import com.typemaster.arena.service.LeaderboardService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** GET /api/leaderboard?sort=wpm|accuracy|racing|levels|score&limit=10 (public) */
@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public List<LeaderboardDto> top(@RequestParam(defaultValue = "wpm") String sort,
                                    @RequestParam(defaultValue = "10") int limit) {
        return leaderboardService.top(sort, limit);
    }
}
