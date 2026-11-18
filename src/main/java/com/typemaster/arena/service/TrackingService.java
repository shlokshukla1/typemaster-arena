package com.typemaster.arena.service;

import com.typemaster.arena.entity.DailyTraffic;
import com.typemaster.arena.entity.GamePlay;
import com.typemaster.arena.entity.SiteVisitor;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.repository.DailyTrafficRepository;
import com.typemaster.arena.repository.GamePlayRepository;
import com.typemaster.arena.repository.SiteVisitorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Anonymous traffic tracking for the admin panel: page views, unique visitors per day,
 * who is online (heartbeat) and games played by everyone, guests included.
 * Only a random browser id is stored - no IP address, no cookies, no personal data.
 */
@Service
public class TrackingService {

    private static final Pattern VISITOR_ID = Pattern.compile("^[A-Za-z0-9-]{8,64}$");

    private final SiteVisitorRepository visitorRepository;
    private final DailyTrafficRepository trafficRepository;
    private final GamePlayRepository playRepository;

    public TrackingService(SiteVisitorRepository visitorRepository, DailyTrafficRepository trafficRepository,
                           GamePlayRepository playRepository) {
        this.visitorRepository = visitorRepository;
        this.trafficRepository = trafficRepository;
        this.playRepository = playRepository;
    }

    public static boolean validId(String id) {
        return id != null && VISITOR_ID.matcher(id).matches();
    }

    /** Records one page view (synchronized so concurrent views don't lose counter updates). */
    @Transactional
    public synchronized void pageView(String visitorId, User user) {
        if (!validId(visitorId)) return;
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        DailyTraffic day = trafficRepository.findById(today).orElseGet(() -> new DailyTraffic(today));
        SiteVisitor v = visitorRepository.findById(visitorId).orElse(null);
        boolean firstVisitToday = v == null || v.getLastSeen().toLocalDate().isBefore(today) || v.getPageViews() == 0;
        if (v == null) v = new SiteVisitor(visitorId, now);
        v.setPageViews(v.getPageViews() + 1);
        v.setLastSeen(now);
        if (user != null) v.setUserId(user.getId());
        visitorRepository.save(v);

        day.setPageViews(day.getPageViews() + 1);
        if (firstVisitToday) day.setUniqueVisitors(day.getUniqueVisitors() + 1);
        trafficRepository.save(day);
    }

    /** Heartbeat every minute while the tab is open - powers "online now". */
    @Transactional
    public void ping(String visitorId, User user) {
        if (!validId(visitorId)) return;
        visitorRepository.findById(visitorId).ifPresent(v -> {
            if (!v.getLastSeen().toLocalDate().isBefore(LocalDate.now())) {
                v.setLastSeen(LocalDateTime.now());
                if (user != null) v.setUserId(user.getId());
                visitorRepository.save(v);
            }
        });
    }

    /** Counts a finished game (guests included). */
    @Transactional
    public void gamePlayed(String visitorId, String gameType, User user) {
        playRepository.save(new GamePlay(ScoreService.parseGameType(gameType),
                validId(visitorId) ? visitorId : null, user == null ? null : user.getId(), LocalDateTime.now()));
    }
}
