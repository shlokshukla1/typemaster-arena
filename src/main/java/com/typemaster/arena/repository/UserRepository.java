package com.typemaster.arena.repository;

import com.typemaster.arena.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByAuthToken(String authToken);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("select u.createdAt from User u where u.createdAt >= :since")
    List<LocalDateTime> createdSince(@Param("since") LocalDateTime since);

    // ---------------- admin user search (q = '' matches everyone) ----------------
    String SEARCH = " where lower(u.username) like lower(concat('%', :q, '%')) or lower(u.email) like lower(concat('%', :q, '%'))";
    String COUNT = "select count(u) from User u" + SEARCH;

    @Query(value = "select u from User u" + SEARCH + " order by u.createdAt desc", countQuery = COUNT)
    Page<User> searchNewest(@Param("q") String q, Pageable pageable);

    @Query(value = "select u from User u left join LeaderboardEntry l on l.user = u" + SEARCH
            + " order by coalesce(l.levelsCompleted, 0) desc, u.createdAt desc", countQuery = COUNT)
    Page<User> searchByLevels(@Param("q") String q, Pageable pageable);

    @Query(value = "select u from User u left join LeaderboardEntry l on l.user = u" + SEARCH
            + " order by coalesce(l.bestWpm, 0) desc, u.createdAt desc", countQuery = COUNT)
    Page<User> searchByWpm(@Param("q") String q, Pageable pageable);

    @Query(value = "select u from User u left join LeaderboardEntry l on l.user = u" + SEARCH
            + " order by coalesce(l.gamesPlayed, 0) desc, u.createdAt desc", countQuery = COUNT)
    Page<User> searchByGames(@Param("q") String q, Pageable pageable);
}
