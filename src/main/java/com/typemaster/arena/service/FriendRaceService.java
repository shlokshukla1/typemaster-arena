package com.typemaster.arena.service;

import com.typemaster.arena.exception.ApiException;
import com.typemaster.arena.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "Play with Friend" car races. Rooms live in memory only (a race lasts a few minutes):
 *  - a player creates a room and shares its 6-character code / link
 *  - when the friend joins, both get the same start time (5 s countdown) and the same word seed
 *  - each client posts its distance a few times per second and receives the other player's
 *  - the first player to reach the finish wins; both can ask for a rematch in the same room
 */
@Service
public class FriendRaceService {

    public static final long COUNTDOWN_MS = 5_000;
    private static final long ROOM_IDLE_MS = 30 * 60_000;   // forget rooms nobody used for 30 min
    private static final long OFFLINE_MS = 8_000;           // player counts as gone after 8 s without updates
    private static final int MAX_ROOMS = 5_000;
    private static final String CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

    private final SecureRandom random = new SecureRandom();
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public enum Difficulty {
        EASY("EASY", 120, 0, "DAY"),
        MEDIUM("MEDIUM", 180, 1, "SUNSET"),
        HARD("HARD", 250, 2, "NIGHT");

        final String pool; final int distance; final double penalty; final String theme;

        Difficulty(String pool, int distance, double penalty, String theme) {
            this.pool = pool; this.distance = distance; this.penalty = penalty; this.theme = theme;
        }

        static Difficulty parse(String s) {
            try { return s == null ? EASY : valueOf(s.trim().toUpperCase()); } catch (IllegalArgumentException e) { return EASY; }
        }
    }

    static final class Player {
        final String id = UUID.randomUUID().toString();
        final String name;
        double distance;
        long finishedAt;        // server time the finish line was crossed, 0 = not yet
        double wpm, accuracy;
        boolean rematch;
        boolean left;
        long lastSeen = System.currentTimeMillis();

        Player(String name) { this.name = name; }

        boolean online(long now) { return !left && now - lastSeen < OFFLINE_MS; }
    }

    static final class Room {
        final String code;
        final Difficulty difficulty;
        final List<Player> players = new ArrayList<>(2);
        long seed;
        int round = 1;
        long startAt;           // 0 = still waiting for the friend
        long lastActivity = System.currentTimeMillis();

        Room(String code, Difficulty difficulty, long seed) { this.code = code; this.difficulty = difficulty; this.seed = seed; }
    }

    // ------------------------------------------------------------------ API

    public Map<String, Object> create(String name, String difficulty) {
        cleanup();
        if (rooms.size() >= MAX_ROOMS) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Too many open rooms right now - please try again in a minute.");
        String code;
        do { code = newCode(); } while (rooms.containsKey(code));
        Room room = new Room(code, Difficulty.parse(difficulty), random.nextInt(Integer.MAX_VALUE));
        Player p = new Player(cleanName(name));
        room.players.add(p);
        rooms.put(code, room);
        return withPlayer(room, p);
    }

    public Map<String, Object> join(String code, String name) {
        Room room = find(code);
        synchronized (room) {
            if (room.players.size() >= 2) {
                throw new ApiException(HttpStatus.CONFLICT, "This race already has two players. Ask your friend for a new code.");
            }
            if (!room.players.get(0).online(System.currentTimeMillis())) {
                rooms.remove(room.code);
                throw new ResourceNotFoundException("Your friend is no longer waiting in this race. Ask them for a new code.");
            }
            Player p = new Player(cleanName(name));
            if (p.name.equalsIgnoreCase(room.players.get(0).name)) {
                // both called e.g. "Guest" - keep the cars apart on screen
                p = new Player(p.name.length() > 16 ? p.name.substring(0, 16) + " 2" : p.name + " 2");
            }
            room.players.add(p);
            long now = System.currentTimeMillis();
            room.startAt = now + COUNTDOWN_MS;   // both start together after the countdown
            room.lastActivity = now;
            return withPlayer(room, p);
        }
    }

    /** Called a few times per second by each client: stores its progress and returns the room state. */
    public Map<String, Object> update(String code, String playerId, double distance, double wpm, double accuracy) {
        Room room = find(code);
        synchronized (room) {
            Player me = player(room, playerId);
            long now = System.currentTimeMillis();
            me.lastSeen = now;
            room.lastActivity = now;
            boolean racing = room.startAt > 0 && now >= room.startAt && !finished(room);
            if (racing) {
                double max = room.difficulty.distance;
                me.distance = Math.max(0, Math.min(max, distance));
                me.wpm = clamp(wpm, 0, 400);
                me.accuracy = clamp(accuracy, 0, 100);
                if (me.distance >= max && me.finishedAt == 0) me.finishedAt = now;
            }
            return state(room, me);
        }
    }

    public Map<String, Object> rematch(String code, String playerId) {
        Room room = find(code);
        synchronized (room) {
            Player me = player(room, playerId);
            me.rematch = true;
            me.lastSeen = System.currentTimeMillis();
            boolean bothReady = room.players.size() == 2 && room.players.stream().allMatch(p -> p.rematch && !p.left);
            if (bothReady && finished(room)) {
                room.round++;
                room.seed = random.nextInt(Integer.MAX_VALUE);
                for (Player p : room.players) { p.distance = 0; p.finishedAt = 0; p.wpm = 0; p.accuracy = 0; p.rematch = false; }
                room.startAt = System.currentTimeMillis() + COUNTDOWN_MS;
            }
            return state(room, me);
        }
    }

    public void leave(String code, String playerId) {
        Room room = rooms.get(normalize(code));
        if (room == null) return;
        synchronized (room) {
            room.players.stream().filter(p -> p.id.equals(playerId)).forEach(p -> p.left = true);
            if (room.players.stream().allMatch(p -> p.left)) rooms.remove(room.code);
        }
    }

    // ------------------------------------------------------------------ helpers

    private Map<String, Object> withPlayer(Room room, Player p) {
        Map<String, Object> s = state(room, p);
        s.put("playerId", p.id);
        return s;
    }

    private Map<String, Object> state(Room room, Player me) {
        long now = System.currentTimeMillis();
        String status;
        if (room.players.size() < 2) status = "WAITING";
        else if (finished(room)) status = "FINISHED";
        else if (now < room.startAt) status = "COUNTDOWN";
        else status = "RACING";

        List<Map<String, Object>> list = new ArrayList<>();
        Player winner = winner(room);
        for (Player p : room.players) {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("name", p.name);
            m.put("you", p == me);
            m.put("distance", Math.round(p.distance * 10) / 10.0);
            m.put("finished", p.finishedAt > 0);
            m.put("timeMs", p.finishedAt > 0 ? p.finishedAt - room.startAt : null);
            m.put("wpm", Math.round(p.wpm * 10) / 10.0);
            m.put("accuracy", Math.round(p.accuracy * 10) / 10.0);
            m.put("rematch", p.rematch);
            m.put("online", p.online(now));
            m.put("winner", p == winner);
            list.add(m);
        }
        Map<String, Object> s = new java.util.LinkedHashMap<>();
        s.put("code", room.code);
        s.put("status", status);
        s.put("difficulty", room.difficulty.name());
        s.put("pool", room.difficulty.pool);
        s.put("theme", room.difficulty.theme);
        s.put("distance", room.difficulty.distance);
        s.put("penalty", room.difficulty.penalty);
        s.put("seed", room.seed);
        s.put("round", room.round);
        s.put("startAt", room.startAt);
        s.put("serverNow", now);
        s.put("players", list);
        return s;
    }

    /** The race is over when someone crossed the line, or the other player left / went offline mid-race. */
    private boolean finished(Room room) {
        if (room.players.size() < 2 || room.startAt == 0) return false;
        if (room.players.stream().anyMatch(p -> p.finishedAt > 0)) return true;
        long now = System.currentTimeMillis();
        return now > room.startAt + 2_000 && room.players.stream().anyMatch(p -> !p.online(now));
    }

    private Player winner(Room room) {
        if (!finished(room)) return null;
        Player best = null;
        for (Player p : room.players) {
            if (p.finishedAt > 0 && (best == null || best.finishedAt == 0 || p.finishedAt < best.finishedAt
                    || (p.finishedAt == best.finishedAt && p.distance > best.distance))) best = p;
        }
        if (best != null) return best;
        long now = System.currentTimeMillis();   // nobody finished: the player still online wins
        return room.players.stream().filter(p -> p.online(now)).findFirst().orElse(null);
    }

    private Room find(String code) {
        Room room = rooms.get(normalize(code));
        if (room == null) throw new ResourceNotFoundException("Race not found. Check the code - it may have expired.");
        return room;
    }

    private Player player(Room room, String playerId) {
        return room.players.stream().filter(p -> p.id.equals(playerId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "You are not part of this race."));
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        for (Iterator<Room> it = rooms.values().iterator(); it.hasNext(); ) {
            if (now - it.next().lastActivity > ROOM_IDLE_MS) it.remove();
        }
    }

    private String newCode() {
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        return sb.toString();
    }

    private static String normalize(String code) {
        return code == null ? "" : code.trim().toUpperCase();
    }

    private static String cleanName(String name) {
        String n = name == null ? "" : name.replaceAll("[^\\p{L}\\p{N}_ .-]", "").trim();
        if (n.isEmpty()) n = "Guest";
        return n.length() > 20 ? n.substring(0, 20) : n;
    }

    private static double clamp(double v, double lo, double hi) {
        return Double.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v));
    }
}
