package com.typemaster.arena.controller;

import com.typemaster.arena.config.CurrentUser;
import com.typemaster.arena.dto.AdminDtos.TrackRequest;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.service.TrackingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Anonymous traffic tracking used by the admin panel (public, login optional).
 * POST /api/track/visit  {visitorId, page}
 * POST /api/track/ping   {visitorId}
 * POST /api/track/game   {visitorId, gameType}
 */
@RestController
@RequestMapping("/api/track")
public class TrackController {

    private final TrackingService trackingService;

    public TrackController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @PostMapping("/visit")
    public ResponseEntity<Void> visit(@CurrentUser(required = false) User user, @RequestBody TrackRequest req) {
        trackingService.pageView(req.visitorId(), user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ping")
    public ResponseEntity<Void> ping(@CurrentUser(required = false) User user, @RequestBody TrackRequest req) {
        trackingService.ping(req.visitorId(), user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/game")
    public ResponseEntity<Void> game(@CurrentUser(required = false) User user, @RequestBody TrackRequest req) {
        trackingService.gamePlayed(req.visitorId(), req.gameType(), user);
        return ResponseEntity.noContent().build();
    }
}
