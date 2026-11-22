package com.typemaster.arena.controller;

import com.typemaster.arena.service.FriendRaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Play with Friend (two-player car race). No login needed.
 * POST /api/friend/rooms                      {name, difficulty}            create a room, returns code + playerId
 * POST /api/friend/rooms/{code}/join          {name}                        join with the code (starts the 5 s countdown)
 * POST /api/friend/rooms/{code}/state         {playerId, distance, wpm, accuracy}  send progress, get both cars
 * POST /api/friend/rooms/{code}/rematch       {playerId}                    race again when both press it
 * POST /api/friend/rooms/{code}/leave         {playerId}
 */
@RestController
@RequestMapping("/api/friend/rooms")
public class FriendRaceController {

    private final FriendRaceService service;

    public FriendRaceController(FriendRaceService service) {
        this.service = service;
    }

    public record CreateRequest(String name, String difficulty) {}
    public record JoinRequest(String name) {}
    public record StateRequest(String playerId, Double distance, Double wpm, Double accuracy) {}
    public record PlayerRequest(String playerId) {}

    @PostMapping
    public Map<String, Object> create(@RequestBody CreateRequest req) {
        return service.create(req.name(), req.difficulty());
    }

    @PostMapping("/{code}/join")
    public Map<String, Object> join(@PathVariable String code, @RequestBody JoinRequest req) {
        return service.join(code, req.name());
    }

    @PostMapping("/{code}/state")
    public Map<String, Object> state(@PathVariable String code, @RequestBody StateRequest req) {
        return service.update(code, req.playerId(), val(req.distance()), val(req.wpm()), val(req.accuracy()));
    }

    @PostMapping("/{code}/rematch")
    public Map<String, Object> rematch(@PathVariable String code, @RequestBody PlayerRequest req) {
        return service.rematch(code, req.playerId());
    }

    @PostMapping("/{code}/leave")
    public ResponseEntity<Void> leave(@PathVariable String code, @RequestBody PlayerRequest req) {
        service.leave(code, req.playerId());
        return ResponseEntity.noContent().build();
    }

    private static double val(Double d) {
        return d == null ? 0 : d;
    }
}
