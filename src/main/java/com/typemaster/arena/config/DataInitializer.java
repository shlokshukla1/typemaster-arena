package com.typemaster.arena.config;

import com.typemaster.arena.entity.RacingLevel;
import com.typemaster.arena.repository.RacingLevelRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds / refreshes the 200 AI racing levels (8 chapters x 25) at startup.
 *
 * <ul>
 *   <li>AI speed: level 1 = 1 m/s, 2 = 2 m/s, 3 = 3 m/s, then a smooth curve up to 12 m/s at level 200.</li>
 *   <li>Distance: 90 m growing to 400 m. Mistake penalty: 0 m growing to 3 m.</li>
 *   <li>Every 5th stage uses a special word pool (capitals, punctuation, numbers, mixed);
 *       every 25th level is a chapter final. Winning level 50 earns the certificate.</li>
 * </ul>
 * The formula MUST stay identical to static/js/data/levels.js.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    public static final int TOTAL_LEVELS = 200;
    public static final int CERTIFICATE_LEVEL = 50;

    /** Chapter definition: name, theme, base pool, alternate pool, final-level name, 5 track names. */
    private record Chapter(String name, String theme, String base, String alt, String finalName, List<String> tracks) { }

    private static final List<Chapter> CHAPTERS = List.of(
            new Chapter("Rookie Circuit", "DAY", "EASY", "EASY", "Rookie Cup Final",
                    List.of("Rookie Rally", "Neighbourhood Dash", "Park Loop", "School Run", "Village Sprint")),
            new Chapter("City Grand Prix", "NIGHT", "EASY", "MEDIUM", "Certification Grand Prix",
                    List.of("Downtown Dash", "City Lights", "Harbour Bridge", "Metro Mile", "Skyline Sprint")),
            new Chapter("Desert Rally", "DESERT", "MEDIUM", "MEDIUM", "Desert King Final",
                    List.of("Dune Runner", "Canyon Run", "Mirage Mile", "Oasis Loop", "Sandstorm Sprint")),
            new Chapter("Frozen Peaks", "SNOW", "MEDIUM", "HARD", "Century Cup",
                    List.of("Frozen Track", "Blizzard Bend", "Glacier Gap", "Avalanche Alley", "Polar Pass")),
            new Chapter("Neon Nights", "NEON", "HARD", "HARD", "Neon Crown Final",
                    List.of("Neon Boulevard", "Synthwave Strip", "Laser Lane", "Pixel Parkway", "Cyber Circuit")),
            new Chapter("Coastal Highway", "SUNSET", "HARD", "MIXED", "Coastal Championship",
                    List.of("Sunset Sprint", "Ocean Drive", "Palm Avenue", "Lighthouse Loop", "Tidal Turn")),
            new Chapter("Mountain Pass", "DAY", "EXPERT", "MIXED", "Mountain Master Final",
                    List.of("Eagle Ridge", "Thunder Pass", "Summit Climb", "Pine Valley", "Cliffside Curve")),
            new Chapter("Legends League", "NEON", "EXPERT", "EXPERT", "TypeMaster Grand Final",
                    List.of("Champion's Circuit", "Titan Track", "Legend Loop", "Hall of Fame Highway", "Grand Master Mile"))
    );

    private static final String[] SPECIAL_POOLS = {"CAPITALS", "PUNCTUATION", "NUMBERS", "MIXED"};
    private static final String[] ROMAN = {"I", "II", "III", "IV", "V"};

    private final RacingLevelRepository levelRepository;

    public DataInitializer(RacingLevelRepository levelRepository) {
        this.levelRepository = levelRepository;
    }

    private static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    /** AI speed for a level (m/s). */
    public static double aiSpeedFor(int n) {
        return n <= 3 ? n : round1(3 + 9 * Math.pow((n - 3) / (double) (TOTAL_LEVELS - 3), 0.8));
    }

    /** Track length for a level (m), rounded to 10. */
    public static int distanceFor(int n) {
        return (int) (Math.round((90 + 310 * Math.pow((n - 1) / (double) (TOTAL_LEVELS - 1), 0.7)) / 10.0) * 10);
    }

    /** Metres lost per wrong keystroke. */
    public static double penaltyFor(int n) {
        return n <= 2 ? 0 : Math.min(3, Math.round((0.5 + n / 50.0) * 2) / 2.0);
    }

    private static String pool(int n, int stage, Chapter ch) {
        if (stage % 5 == 0 && stage != 25 && n > 5) return SPECIAL_POOLS[(n / 5) % 4];
        return stage % 2 == 0 || stage == 25 ? ch.alt() : ch.base();
    }

    private static String describe(String pool) {
        return switch (pool) {
            case "EASY" -> "Short, easy words.";
            case "MEDIUM" -> "Everyday medium-length words.";
            case "HARD" -> "Long, difficult words.";
            case "EXPERT" -> "Expert vocabulary with tricky spellings.";
            case "CAPITALS" -> "Capitalised words - master the Shift key.";
            case "PUNCTUATION" -> "Words with commas, periods and quotes.";
            case "NUMBERS" -> "Digits and numeric codes.";
            default -> "A mix of everything.";
        };
    }

    /** 3.0 -> "3", 3.5 -> "3.5" (same text as the JavaScript table). */
    private static String num(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    /** Builds the definition of level n (1-200). */
    public static RacingLevel build(int n) {
        int c = (n - 1) / 25;
        int stage = (n - 1) % 25 + 1;
        int round = (stage - 1) / 5;
        Chapter ch = CHAPTERS.get(c);
        String pool = pool(n, stage, ch);
        String theme = round == 2 ? ("NIGHT".equals(ch.theme()) ? "NEON" : "NIGHT") : ch.theme();
        String name = stage == 25 ? ch.finalName() : ch.tracks().get((stage - 1) % 5) + " " + ROMAN[round];
        double ai = aiSpeedFor(n);
        int dist = distanceFor(n);
        double pen = penaltyFor(n);
        StringBuilder challenge = new StringBuilder(describe(pool))
                .append(" AI drives at ").append(num(ai)).append(" m/s over ").append(dist).append(" m.");
        challenge.append(pen > 0 ? " Each mistake costs " + num(pen) + " m." : " No mistake penalty.");
        if (n == CERTIFICATE_LEVEL) challenge.append(" Win to earn your certificate!");
        else if (stage == 25) challenge.append(" Chapter final!");
        return new RacingLevel(n, name, ai, dist, pool, pen, theme, challenge.toString());
    }

    @Override
    @Transactional
    public void run(String... args) {
        for (int n = 1; n <= TOTAL_LEVELS; n++) {
            RacingLevel def = build(n);
            RacingLevel level = levelRepository.findByLevelNumber(n).orElseGet(RacingLevel::new);
            level.setLevelNumber(n);
            level.setName(def.getName());
            level.setAiSpeed(def.getAiSpeed());
            level.setDistanceMeters(def.getDistanceMeters());
            level.setWordPool(def.getWordPool());
            level.setMistakePenalty(def.getMistakePenalty());
            level.setTheme(def.getTheme());
            level.setChallenge(def.getChallenge());
            levelRepository.save(level);
        }
        log.info("Racing levels ready: {}", levelRepository.count());
    }
}
