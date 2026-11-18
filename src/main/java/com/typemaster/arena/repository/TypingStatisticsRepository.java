package com.typemaster.arena.repository;

import com.typemaster.arena.entity.TypingStatistics;
import com.typemaster.arena.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TypingStatisticsRepository extends JpaRepository<TypingStatistics, Long> {
    Optional<TypingStatistics> findByUser(User user);
}
