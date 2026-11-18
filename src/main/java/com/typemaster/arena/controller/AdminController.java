package com.typemaster.arena.controller;

import com.typemaster.arena.config.CurrentUser;
import com.typemaster.arena.dto.AdminDtos.*;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.service.AdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin panel API - every endpoint requires a logged-in user with role ADMIN (else 401 / 403).
 *
 * GET /api/admin/overview            headline numbers (users, online now, traffic today, games)
 * GET /api/admin/traffic?days=14     daily page views, unique visitors, games, sign-ups
 * GET /api/admin/games               plays per game
 * GET /api/admin/users?q=&sort=&page=&size=   users with their progress
 * GET /api/admin/users/{id}          one user's full stats, levels and recent games
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/overview")
    public Overview overview(@CurrentUser User admin) {
        adminService.requireAdmin(admin);
        return adminService.overview();
    }

    @GetMapping("/traffic")
    public List<TrafficDay> traffic(@CurrentUser User admin, @RequestParam(defaultValue = "14") int days) {
        adminService.requireAdmin(admin);
        return adminService.traffic(days);
    }

    @GetMapping("/games")
    public List<GameStat> games(@CurrentUser User admin) {
        adminService.requireAdmin(admin);
        return adminService.games();
    }

    @GetMapping("/users")
    public UserPage users(@CurrentUser User admin,
                          @RequestParam(defaultValue = "") String q,
                          @RequestParam(defaultValue = "newest") String sort,
                          @RequestParam(defaultValue = "0") int page,
                          @RequestParam(defaultValue = "20") int size) {
        adminService.requireAdmin(admin);
        return adminService.users(q, sort, page, size);
    }

    @GetMapping("/users/{id}")
    public UserDetail user(@CurrentUser User admin, @PathVariable Long id) {
        adminService.requireAdmin(admin);
        return adminService.user(id);
    }
}
