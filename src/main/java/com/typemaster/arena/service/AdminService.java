package com.typemaster.arena.service;

import com.typemaster.arena.config.DataInitializer;
import com.typemaster.arena.dto.AdminDtos.*;
import com.typemaster.arena.dto.GameHistoryDto;
import com.typemaster.arena.dto.LevelProgressDto;
import com.typemaster.arena.entity.DailyTraffic;
import com.typemaster.arena.entity.GameType;
import com.typemaster.arena.entity.LeaderboardEntry;
import com.typemaster.arena.entity.User;
import com.typemaster.arena.exception.ApiException;
import com.typemaster.arena.exception.ResourceNotFoundException;
import com.typemaster.arena.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Read-only statistics for the admin panel. Every method requires an ADMIN user. */
@Service
public class AdminService {

    /** A visitor whose heartbeat arrived within this many minutes counts as "online". */
    private static final int ONLINE_MINUTES = 2;

    private final UserRepository userRepository;
    private final SiteVisitorRepository visitorRepository;
    private final DailyTrafficRepository trafficRepository;
    private final GamePlayRepository playRepository;
    private final GameHistoryRepository historyRepository;
    private final LeaderboardRepository leaderboardRepository;
    private final UserLevelProgressRepository progressRepository;
    private final StatisticsService statisticsService;

    public AdminService(UserRepository userRepository, SiteVisitorRepository visitorRepository,
                        DailyTrafficRepository trafficRepository, GamePlayRepository playRepository,
                        GameHistoryRepository historyRepository, LeaderboardRepository leaderboardRepository,
                        UserLevelProgressRepository progressRepository, StatisticsService statisticsService) {
        this.userRepository = userRepository;
        this.visitorRepository = visitorRepository;
        this.trafficRepository = trafficRepository;
        this.playRepository = playRepository;
        this.historyRepository = historyRepository;
        this.leaderboardRepository = leaderboardRepository;
        this.progressRepository = progressRepository;
        this.statisticsService = statisticsService;
    }

    public void requireAdmin(User user) {
        if (user == null || !user.isAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access only");
        }
    }

    @Transactional(readOnly = true)
    public Overview overview() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        DailyTraffic today = trafficRepository.findById(LocalDate.now()).orElseGet(() -> new DailyTraffic(LocalDate.now()));
        return new Overview(
                userRepository.count(),
                userRepository.countByCreatedAtAfter(startOfDay),
                userRepository.countByCreatedAtAfter(startOfDay.minusDays(6)),
                visitorRepository.countByLastSeenAfter(now.minusMinutes(ONLINE_MINUTES)),
                today.getUniqueVisitors(),
                today.getPageViews(),
                visitorRepository.count(),
                trafficRepository.totalPageViews(),
                playRepository.countByPlayedAtAfter(startOfDay),
                playRepository.count(),
                historyRepository.activePlayersSince(startOfDay),
                progressRepository.countCompleted(DataInitializer.CERTIFICATE_LEVEL),
                historyRepository.count(),
                now);
    }

    /** Daily traffic for the last {@code days} days (oldest first, days without data are zero). */
    @Transactional(readOnly = true)
    public List<TrafficDay> traffic(int days) {
        days = Math.max(1, Math.min(days, 90));
        LocalDate from = LocalDate.now().minusDays(days - 1L);
        Map<LocalDate, DailyTraffic> byDay = trafficRepository.findByDayGreaterThanEqualOrderByDayAsc(from).stream()
                .collect(Collectors.toMap(DailyTraffic::getDay, Function.identity()));
        Map<LocalDate, Long> games = playRepository.playTimesSince(from.atStartOfDay()).stream()
                .collect(Collectors.groupingBy(LocalDateTime::toLocalDate, Collectors.counting()));
        Map<LocalDate, Long> signups = userRepository.createdSince(from.atStartOfDay()).stream()
                .collect(Collectors.groupingBy(LocalDateTime::toLocalDate, Collectors.counting()));
        List<TrafficDay> out = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(LocalDate.now()); d = d.plusDays(1)) {
            DailyTraffic t = byDay.get(d);
            out.add(new TrafficDay(d, t == null ? 0 : t.getPageViews(), t == null ? 0 : t.getUniqueVisitors(),
                    games.getOrDefault(d, 0L), signups.getOrDefault(d, 0L)));
        }
        return out;
    }

    /** Plays per game: all time and last 7 days, most played first. */
    @Transactional(readOnly = true)
    public List<GameStat> games() {
        Map<GameType, Long> all = toMap(playRepository.countByGameSince(LocalDateTime.of(2000, 1, 1, 0, 0)));
        Map<GameType, Long> week = toMap(playRepository.countByGameSince(LocalDate.now().minusDays(6).atStartOfDay()));
        return Arrays.stream(GameType.values())
                .map(g -> new GameStat(g.name(), all.getOrDefault(g, 0L), week.getOrDefault(g, 0L)))
                .sorted(Comparator.comparingLong(GameStat::plays).reversed())
                .toList();
    }

    private static Map<GameType, Long> toMap(List<Object[]> rows) {
        Map<GameType, Long> m = new EnumMap<>(GameType.class);
        for (Object[] r : rows) m.put((GameType) r[0], ((Number) r[1]).longValue());
        return m;
    }

    /**
     * Searchable, sortable user list with progress.
     * @param sort newest | levels | wpm | games
     */
    @Transactional(readOnly = true)
    public UserPage users(String q, String sort, int page, int size) {
        String query = q == null ? "" : q.trim();
        Pageable p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<User> users = switch (sort == null ? "newest" : sort) {
            case "levels" -> userRepository.searchByLevels(query, p);
            case "wpm" -> userRepository.searchByWpm(query, p);
            case "games" -> userRepository.searchByGames(query, p);
            default -> userRepository.searchNewest(query, p);
        };
        List<UserRow> rows = rows(users.getContent());
        return new UserPage(rows, users.getNumber(), users.getSize(), users.getTotalElements(), users.getTotalPages());
    }

    @Transactional(readOnly = true)
    public UserDetail user(Long id) {
        User u = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<LevelProgressDto> completed = progressRepository.findByUser(u).stream()
                .filter(x -> x.isCompleted())
                .map(LevelProgressDto::from)
                .sorted(Comparator.comparingInt(LevelProgressDto::level))
                .toList();
        List<GameHistoryDto> recent = historyRepository.findByUserOrderByPlayedAtDesc(u, PageRequest.of(0, 15))
                .map(GameHistoryDto::from).getContent();
        return new UserDetail(rows(List.of(u)).get(0), statisticsService.statsFor(u), completed, recent);
    }

    /** Builds table rows for a batch of users with a fixed number of queries. */
    private List<UserRow> rows(List<User> users) {
        if (users.isEmpty()) return List.of();
        Map<Long, LeaderboardEntry> lb = leaderboardRepository.findByUserIn(users).stream()
                .collect(Collectors.toMap(e -> e.getUser().getId(), Function.identity()));
        Map<Long, Object[]> progress = new HashMap<>();
        for (Object[] r : progressRepository.summaryFor(users)) progress.put((Long) r[0], r);
        Set<Long> certified = new HashSet<>(progressRepository.completedLevel(users, DataInitializer.CERTIFICATE_LEVEL));
        Map<Long, LocalDateTime> lastPlayed = new HashMap<>();
        for (Object[] r : historyRepository.lastPlayed(users)) lastPlayed.put((Long) r[0], (LocalDateTime) r[1]);

        List<UserRow> out = new ArrayList<>();
        for (User u : users) {
            LeaderboardEntry e = lb.get(u.getId());
            Object[] pr = progress.get(u.getId());
            out.add(new UserRow(u.getId(), u.getUsername(), u.getEmail(), u.getRole(), u.getCreatedAt(), u.getLastLoginAt(),
                    lastPlayed.get(u.getId()),
                    e == null ? 0 : e.getGamesPlayed(),
                    e == null ? 0 : LeaderboardService.round1(e.getBestWpm()),
                    e == null ? 0 : LeaderboardService.round1(e.getBestAccuracy()),
                    e == null ? 0 : e.getTotalScore(),
                    e == null ? 0 : e.getLevelsCompleted(),
                    pr == null ? 1 : ((Number) pr[2]).intValue(),
                    pr == null ? 0 : ((Number) pr[1]).intValue(),
                    certified.contains(u.getId())));
        }
        return out;
    }
}
