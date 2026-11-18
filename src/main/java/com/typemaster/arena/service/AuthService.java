package com.typemaster.arena.service;

import com.typemaster.arena.dto.AuthResponse;
import com.typemaster.arena.dto.LoginRequest;
import com.typemaster.arena.dto.RegisterRequest;
import com.typemaster.arena.dto.UserDto;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.exception.ApiException;
import com.typemaster.arena.exception.UnauthorizedException;
import com.typemaster.arena.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

/** Registration, login and token validation. Passwords are stored as BCrypt hashes. */
@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final int tokenDays;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       @Value("${app.auth.token-days:30}") int tokenDays) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenDays = tokenDays;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String username = req.username().trim();
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username '" + username + "' is already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        issueToken(user);
        userRepository.save(user);
        return new AuthResponse(user.getAuthToken(), UserDto.from(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String login = req.login().trim();
        User user = (login.contains("@")
                ? userRepository.findByEmailIgnoreCase(login)
                : userRepository.findByUsernameIgnoreCase(login))
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new UnauthorizedException("Invalid username/email or password"));
        issueToken(user);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        return new AuthResponse(user.getAuthToken(), UserDto.from(user));
    }

    @Transactional
    public void logout(User user) {
        user.setAuthToken(null);
        user.setTokenExpiresAt(null);
        userRepository.save(user);
    }

    /** Returns the user owning a valid, non-expired token. */
    @Transactional(readOnly = true)
    public Optional<User> findByToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        return userRepository.findByAuthToken(token)
                .filter(u -> u.getTokenExpiresAt() == null || u.getTokenExpiresAt().isAfter(LocalDateTime.now()));
    }

    private void issueToken(User user) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        user.setAuthToken(HexFormat.of().formatHex(bytes));
        user.setTokenExpiresAt(LocalDateTime.now().plusDays(tokenDays));
    }
}
