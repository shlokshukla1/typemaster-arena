package com.typemaster.arena.repository;

import com.typemaster.arena.entity.LeaderboardEntry;
import com.typemaster.arena.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LeaderboardRepository extends JpaRepository<LeaderboardEntry, Long> {
    Optional<LeaderboardEntry> findByUser(User user);

    List<LeaderboardEntry> findByUserIn(List<User> users);

    /** Players that have played at least one game; ordering comes from the Pageable's Sort. */
    @Query("select l from LeaderboardEntry l where l.gamesPlayed > 0")
    List<LeaderboardEntry> findActive(Pageable pageable);
}
