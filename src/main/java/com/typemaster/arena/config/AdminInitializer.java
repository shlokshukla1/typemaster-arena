package com.typemaster.arena.config;

import com.typemaster.arena.entity.User;
import com.typemaster.arena.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the admin account at startup if it does not exist yet
 * (app.admin.username / app.admin.password / app.admin.email, or env ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL).
 * An existing user with that username is promoted to ADMIN and its password is set to the configured one.
 * No other user is changed.
 */
@Component
public class AdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;
    private final String email;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder,
                            @Value("${app.admin.username}") String username,
                            @Value("${app.admin.password}") String password,
                            @Value("${app.admin.email}") String email) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
        this.email = email;
    }

    @Override
    @Transactional
    public void run(String... args) {
        User admin = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (admin == null) {
            admin = new User();
            admin.setUsername(username);
            admin.setEmail(email);
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole("ADMIN");
            userRepository.save(admin);
            log.info("Admin account '{}' created - log in with it and open #/admin", username);
        } else {
            boolean changed = false;
            if (!admin.isAdmin()) {
                admin.setRole("ADMIN");
                changed = true;
                log.info("User '{}' promoted to ADMIN", username);
            }
            // Keep exactly one admin password: the configured one.
            if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
                admin.setPasswordHash(passwordEncoder.encode(password));
                admin.setAuthToken(null);
                changed = true;
                log.info("Admin '{}' password updated to the configured value", username);
            }
            if (changed) userRepository.save(admin);
        }
    }
}
