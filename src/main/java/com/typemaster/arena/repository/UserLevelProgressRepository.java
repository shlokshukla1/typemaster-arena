package com.typemaster.arena.repository;

import com.typemaster.arena.entity.RacingLevel;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.entity.UserLevelProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserLevelProgressRepository extends JpaRepository<UserLevelProgress, Long> {
    List<UserLevelProgress> findByUser(User user);
    Optional<UserLevelProgress> findByUserAndLevel(User user, RacingLevel level);
    int countByUserAndCompletedTrue(User user);

    /** Rows of [userId, totalStars, highestUnlockedLevel] for a set of users. */
    @Query("select p.user.id, sum(p.stars), max(case when p.unlocked = true then p.level.levelNumber else 1 end)"
            + " from UserLevelProgress p where p.user in :users group by p.user.id")
    List<Object[]> summaryFor(@Param("users") List<User> users);

    /** Ids of the given users who completed a given level (used for the level-50 certificate). */
    @Query("select p.user.id from UserLevelProgress p where p.user in :users and p.level.levelNumber = :level and p.completed = true")
    List<Long> completedLevel(@Param("users") List<User> users, @Param("level") int level);

    @Query("select count(p) from UserLevelProgress p where p.level.levelNumber = :level and p.completed = true")
    long countCompleted(@Param("level") int level);
}
