package com.typemaster.arena.repository;

import com.typemaster.arena.entity.DailyTraffic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface DailyTrafficRepository extends JpaRepository<DailyTraffic, LocalDate> {
    List<DailyTraffic> findByDayGreaterThanEqualOrderByDayAsc(LocalDate from);

    @Query("select coalesce(sum(d.pageViews), 0) from DailyTraffic d")
    long totalPageViews();
}
