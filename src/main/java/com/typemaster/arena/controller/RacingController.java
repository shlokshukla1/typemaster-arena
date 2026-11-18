package com.typemaster.arena.controller;

import com.typemaster.arena.config.CurrentUser;
import com.typemaster.arena.dto.LevelProgressDto;
import com.typemaster.arena.dto.RaceResultRequest;
import com.typemaster.arena.dto.RacingLevelDto;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.service.RacingService;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET  /api/racing/levels         - all level definitions (public)
 * GET  /api/racing/progress       - unlocked/completed levels of the logged-in user
 * POST /api/racing/progress       - record a race result (unlocks next level on win)
 * POST /api/racing/progress/sync  - merge guest localStorage progress after login
 */
@RestController
@RequestMapping("/api/racing")
@Validated
public class RacingController {

    private final RacingService racingService;

    public RacingController(RacingService racingService) {
        this.racingService = racingService;
    }

    @GetMapping("/levels")
    public List<RacingLevelDto> levels() {
        return racingService.levels();
    }

    @GetMapping("/progress")
    public List<LevelProgressDto> progress(@CurrentUser User user) {
        return racingService.progress(user);
    }

    @PostMapping("/progress")
    public List<LevelProgressDto> record(@CurrentUser User user, @Valid @RequestBody RaceResultRequest request) {
        return racingService.recordResult(user, request);
    }

    @PostMapping("/progress/sync")
    public List<LevelProgressDto> sync(@CurrentUser User user, @RequestBody List<@Valid RaceResultRequest> results) {
        return racingService.sync(user, results);
    }
}
