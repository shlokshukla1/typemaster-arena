package com.typemaster.arena.dto;

import com.typemaster.arena.entity.User;

import java.time.LocalDateTime;

public record UserDto(Long id, String username, String email, String role, LocalDateTime createdAt) {
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole(), u.getCreatedAt());
    }
}
