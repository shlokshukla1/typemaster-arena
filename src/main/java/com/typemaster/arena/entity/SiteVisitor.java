package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * One browser (anonymous random id kept in localStorage). No IP address or other
 * personal data is stored - only when the browser was first/last seen and,
 * if the visitor is logged in, which account it belongs to.
 */
@Entity
@Table(name = "site_visitors", indexes = @Index(name = "idx_visitor_last_seen", columnList = "last_seen"))
public class SiteVisitor {

    @Id
    @Column(name = "visitor_id", length = 64)
    private String visitorId;

    @Column(name = "first_seen", nullable = false)
    private LocalDateTime firstSeen;

    @Column(name = "last_seen", nullable = false)
    private LocalDateTime lastSeen;

    @Column(name = "page_views", nullable = false)
    private long pageViews;

    @Column(name = "user_id")
    private Long userId;

    public SiteVisitor() { }

    public SiteVisitor(String visitorId, LocalDateTime now) {
        this.visitorId = visitorId;
        this.firstSeen = now;
        this.lastSeen = now;
    }

    public String getVisitorId() { return visitorId; }
    public LocalDateTime getFirstSeen() { return firstSeen; }
    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
    public long getPageViews() { return pageViews; }
    public void setPageViews(long pageViews) { this.pageViews = pageViews; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
}
