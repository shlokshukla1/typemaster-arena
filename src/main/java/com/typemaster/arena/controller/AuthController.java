package com.typemaster.arena.controller;

import com.typemaster.arena.config.CurrentUser;
import com.typemaster.arena.dto.AuthResponse;
import com.typemaster.arena.dto.LoginRequest;
import com.typemaster.arena.dto.RegisterRequest;
import com.typemaster.arena.dto.UserDto;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** POST /api/auth/register, /login, /logout and GET /api/auth/me */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CurrentUser User user) {
        authService.logout(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserDto me(@CurrentUser User user) {
        return UserDto.from(user);
    }
}
