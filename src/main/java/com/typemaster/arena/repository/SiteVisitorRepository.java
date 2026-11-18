package com.typemaster.arena.repository;

import com.typemaster.arena.entity.SiteVisitor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface SiteVisitorRepository extends JpaRepository<SiteVisitor, String> {
    long countByLastSeenAfter(LocalDateTime since);
    long countByFirstSeenAfter(LocalDateTime since);
}
