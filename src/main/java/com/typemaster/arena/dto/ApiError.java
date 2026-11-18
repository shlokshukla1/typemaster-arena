package com.typemaster.arena.dto;

import java.time.LocalDateTime;
import java.util.Map;

/** Uniform error body returned by GlobalExceptionHandler. */
public record ApiError(int status, String error, String message, Map<String, String> fieldErrors,
                       LocalDateTime timestamp) { }
