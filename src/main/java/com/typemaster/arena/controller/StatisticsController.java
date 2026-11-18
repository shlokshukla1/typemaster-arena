package com.typemaster.arena.controller;

import com.typemaster.arena.config.CurrentUser;
import com.typemaster.arena.dto.GameHistoryDto;
import com.typemaster.arena.dto.GlobalStatsDto;
import com.typemaster.arena.dto.StatsDto;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.service.StatisticsService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/stats/global  - public homepage numbers
 * GET /api/stats/me      - lifetime stats of the logged-in user
 * GET /api/history/me    - paged game history of the logged-in user
 */
@RestController
@RequestMapping("/api")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/stats/global")
    public GlobalStatsDto global() {
        return statisticsService.global();
    }

    @GetMapping("/stats/me")
    public StatsDto myStats(@CurrentUser User user) {
        return statisticsService.statsFor(user);
    }

    @GetMapping("/history/me")
    public Page<GameHistoryDto> myHistory(@CurrentUser User user,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return statisticsService.history(user, page, size);
    }
}
