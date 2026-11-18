package com.typemaster.arena.controller;

import com.typemaster.arena.config.CurrentUser;
import com.typemaster.arena.dto.ScoreRequest;
import com.typemaster.arena.dto.ScoreResponse;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.service.ScoreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** POST /api/scores - save the result of a finished game (login required). */
@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    private final ScoreService scoreService;

    public ScoreController(ScoreService scoreService) {
        this.scoreService = scoreService;
    }

    @PostMapping
    public ResponseEntity<ScoreResponse> submit(@CurrentUser User user, @Valid @RequestBody ScoreRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scoreService.submit(user, request));
    }
}
