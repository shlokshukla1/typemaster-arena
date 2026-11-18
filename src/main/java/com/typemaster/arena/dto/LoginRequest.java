package com.typemaster.arena.dto;

import jakarta.validation.constraints.NotBlank;

/** "login" can be either the username or the email address. */
public record LoginRequest(@NotBlank String login, @NotBlank String password) { }
