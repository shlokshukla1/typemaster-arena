package com.typemaster.arena.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

/** Aggregated traffic for one day (page views and unique visitors). */
@Entity
@Table(name = "daily_traffic")
public class DailyTraffic {

    @Id
    @Column(name = "traffic_day")
    private LocalDate day;

    @Column(name = "page_views", nullable = false)
    private long pageViews;

    @Column(name = "unique_visitors", nullable = false)
    private long uniqueVisitors;

    public DailyTraffic() { }

    public DailyTraffic(LocalDate day) { this.day = day; }

    public LocalDate getDay() { return day; }
    public long getPageViews() { return pageViews; }
    public void setPageViews(long pageViews) { this.pageViews = pageViews; }
    public long getUniqueVisitors() { return uniqueVisitors; }
    public void setUniqueVisitors(long uniqueVisitors) { this.uniqueVisitors = uniqueVisitors; }
}
