package com.typemaster.arena.repository;

import com.typemaster.arena.entity.RacingLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RacingLevelRepository extends JpaRepository<RacingLevel, Long> {
    Optional<RacingLevel> findByLevelNumber(int levelNumber);
    List<RacingLevel> findAllByOrderByLevelNumberAsc();
}
