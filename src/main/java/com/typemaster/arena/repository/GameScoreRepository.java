package com.typemaster.arena.repository;

import com.typemaster.arena.entity.GameScore;
import com.typemaster.arena.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GameScoreRepository extends JpaRepository<GameScore, Long> {

    /** Best score per game type for one user: rows of [GameType, maxScore]. */
    @Query("select s.gameType, max(s.score) from GameScore s where s.user = :user group by s.gameType")
    List<Object[]> bestPerGame(@Param("user") User user);

    @Query("select coalesce(max(s.wpm), 0) from GameScore s")
    double globalBestWpm();

    @Query("select coalesce(max(s.accuracy), 0) from GameScore s where s.wpm > 0")
    double globalBestAccuracy();
}
