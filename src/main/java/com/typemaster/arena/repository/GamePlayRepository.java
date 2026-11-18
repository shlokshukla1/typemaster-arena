package com.typemaster.arena.repository;

import com.typemaster.arena.entity.GamePlay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface GamePlayRepository extends JpaRepository<GamePlay, Long> {
    long countByPlayedAtAfter(LocalDateTime since);

    /** Rows of [GameType, count] for plays since a moment. */
    @Query("select g.gameType, count(g) from GamePlay g where g.playedAt >= :since group by g.gameType")
    List<Object[]> countByGameSince(@Param("since") LocalDateTime since);

    /** Play timestamps since a moment (bucketed per day in Java to stay database-independent). */
    @Query("select g.playedAt from GamePlay g where g.playedAt >= :since")
    List<LocalDateTime> playTimesSince(@Param("since") LocalDateTime since);
}
