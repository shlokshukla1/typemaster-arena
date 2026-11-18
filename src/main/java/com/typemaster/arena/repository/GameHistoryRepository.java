package com.typemaster.arena.repository;

import com.typemaster.arena.entity.GameHistory;
import com.typemaster.arena.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface GameHistoryRepository extends JpaRepository<GameHistory, Long> {
    Page<GameHistory> findByUserOrderByPlayedAtDesc(User user, Pageable pageable);

    /** Rows of [userId, lastPlayedAt]. */
    @Query("select h.user.id, max(h.playedAt) from GameHistory h where h.user in :users group by h.user.id")
    List<Object[]> lastPlayed(@Param("users") List<User> users);

    @Query("select count(distinct h.user.id) from GameHistory h where h.playedAt >= :since")
    long activePlayersSince(@Param("since") LocalDateTime since);
}
