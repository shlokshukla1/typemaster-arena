-- =====================================================================
--  TypeMaster Arena - MySQL 8 database setup
--
--  You do NOT have to run this script: with the default settings Spring Boot
--  creates the database (createDatabaseIfNotExist=true) and the tables
--  (spring.jpa.hibernate.ddl-auto=update) and seeds the 25 racing levels.
--  Use it if you prefer to create everything manually / with a dedicated user.
--
--  mysql -u root -p < database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS typemaster_arena
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE typemaster_arena;

-- Optional dedicated application user (then set DB_USERNAME / DB_PASSWORD)
-- CREATE USER IF NOT EXISTS 'typemaster'@'localhost' IDENTIFIED BY 'change_me';
-- GRANT ALL PRIVILEGES ON typemaster_arena.* TO 'typemaster'@'localhost';
-- FLUSH PRIVILEGES;

-- ---------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  username         VARCHAR(30)  NOT NULL,
  email            VARCHAR(120) NOT NULL,
  password_hash    VARCHAR(100) NOT NULL,           -- BCrypt
  role             VARCHAR(10)  NOT NULL DEFAULT 'USER', -- USER or ADMIN
  auth_token       VARCHAR(64)  NULL,               -- bearer token issued at login
  token_expires_at DATETIME(6)  NULL,
  created_at       DATETIME(6)  NOT NULL,
  last_login_at    DATETIME(6)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_token (auth_token)
) ENGINE=InnoDB;

-- ---------------------------------------------------------- game_scores
CREATE TABLE IF NOT EXISTS game_scores (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  user_id    BIGINT      NOT NULL,
  game_type  VARCHAR(30) NOT NULL,   -- RACING, SPEED, WORDS, FALLING, ZOMBIE, BUBBLE, PARAGRAPH, CODE, NUMBERS, SURVIVAL, PRACTICE
  score      INT         NOT NULL,
  wpm        DOUBLE      NOT NULL,
  accuracy   DOUBLE      NOT NULL,
  net_wpm    DOUBLE      NOT NULL,
  level      INT         NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_scores_user (user_id),
  KEY idx_scores_game (game_type),
  CONSTRAINT fk_scores_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------- typing_statistics
CREATE TABLE IF NOT EXISTS typing_statistics (
  id                    BIGINT      NOT NULL AUTO_INCREMENT,
  user_id               BIGINT      NOT NULL,
  total_games           INT         NOT NULL DEFAULT 0,
  total_words           BIGINT      NOT NULL DEFAULT 0,
  total_correct_chars   BIGINT      NOT NULL DEFAULT 0,
  total_incorrect_chars BIGINT      NOT NULL DEFAULT 0,
  total_time_seconds    BIGINT      NOT NULL DEFAULT 0,
  wpm_sum               DOUBLE      NOT NULL DEFAULT 0,
  best_wpm              DOUBLE      NOT NULL DEFAULT 0,
  best_net_wpm          DOUBLE      NOT NULL DEFAULT 0,
  best_accuracy         DOUBLE      NOT NULL DEFAULT 0,
  best_score            INT         NOT NULL DEFAULT 0,
  updated_at            DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stats_user (user_id),
  CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------- racing_levels
CREATE TABLE IF NOT EXISTS racing_levels (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  level_number    INT          NOT NULL,
  name            VARCHAR(60)  NOT NULL,
  ai_speed        DOUBLE       NOT NULL,   -- meters / second
  distance_meters INT          NOT NULL,
  word_pool       VARCHAR(20)  NOT NULL,
  mistake_penalty DOUBLE       NOT NULL,   -- meters lost per wrong keystroke
  theme           VARCHAR(20)  NOT NULL,
  challenge       VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_level_number (level_number)
) ENGINE=InnoDB;

-- -------------------------------------------------- user_level_progress
CREATE TABLE IF NOT EXISTS user_level_progress (
  id                BIGINT      NOT NULL AUTO_INCREMENT,
  user_id           BIGINT      NOT NULL,
  level_id          BIGINT      NOT NULL,
  unlocked          BIT(1)      NOT NULL,
  completed         BIT(1)      NOT NULL,
  stars             INT         NOT NULL DEFAULT 0,
  best_score        INT         NOT NULL DEFAULT 0,
  best_wpm          DOUBLE      NOT NULL DEFAULT 0,
  best_accuracy     DOUBLE      NOT NULL DEFAULT 0,
  best_time_seconds DOUBLE      NULL,
  attempts          INT         NOT NULL DEFAULT 0,
  updated_at        DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_level (user_id, level_id),
  CONSTRAINT fk_progress_user  FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_level FOREIGN KEY (level_id) REFERENCES racing_levels (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------- leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
  id                   BIGINT      NOT NULL AUTO_INCREMENT,
  user_id              BIGINT      NOT NULL,
  best_wpm             DOUBLE      NOT NULL DEFAULT 0,
  best_accuracy        DOUBLE      NOT NULL DEFAULT 0,
  highest_racing_score INT         NOT NULL DEFAULT 0,
  levels_completed     INT         NOT NULL DEFAULT 0,
  total_score          BIGINT      NOT NULL DEFAULT 0,
  games_played         INT         NOT NULL DEFAULT 0,
  updated_at           DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_leaderboard_user (user_id),
  KEY idx_lb_wpm (best_wpm),
  KEY idx_lb_total (total_score),
  CONSTRAINT fk_leaderboard_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------- game_history
CREATE TABLE IF NOT EXISTS game_history (
  id               BIGINT      NOT NULL AUTO_INCREMENT,
  user_id          BIGINT      NOT NULL,
  game_type        VARCHAR(30) NOT NULL,
  outcome          VARCHAR(20) NOT NULL,   -- WIN, LOSS, COMPLETED
  score            INT         NOT NULL,
  wpm              DOUBLE      NOT NULL,
  accuracy         DOUBLE      NOT NULL,
  net_wpm          DOUBLE      NOT NULL,
  correct_chars    INT         NOT NULL,
  incorrect_chars  INT         NOT NULL,
  words_typed      INT         NOT NULL,
  duration_seconds DOUBLE      NOT NULL,
  level            INT         NULL,
  played_at        DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_history_user_time (user_id, played_at),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------- admin panel: traffic tracking
-- Anonymous: only a random browser id is stored (no IP address, no personal data).
CREATE TABLE IF NOT EXISTS site_visitors (
  visitor_id VARCHAR(64) NOT NULL,
  first_seen DATETIME(6) NOT NULL,
  last_seen  DATETIME(6) NOT NULL,
  page_views BIGINT      NOT NULL DEFAULT 0,
  user_id    BIGINT      NULL,
  PRIMARY KEY (visitor_id),
  KEY idx_visitor_last_seen (last_seen)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_traffic (
  traffic_day     DATE   NOT NULL,
  page_views      BIGINT NOT NULL DEFAULT 0,
  unique_visitors BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (traffic_day)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS game_plays (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  game_type  VARCHAR(30) NOT NULL,
  visitor_id VARCHAR(64) NULL,
  user_id    BIGINT      NULL,
  played_at  DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_plays_time (played_at)
) ENGINE=InnoDB;

-- ------------------------------------------------- racing level seed data
-- 200 levels (8 chapters x 25). The application also inserts/refreshes these rows at every startup.
INSERT INTO racing_levels (level_number, name, ai_speed, distance_meters, word_pool, mistake_penalty, theme, challenge) VALUES
 (1, 'Rookie Rally I', 1, 90, 'EASY', 0, 'DAY', 'Short, easy words. AI drives at 1 m/s over 90 m. No mistake penalty.'),
 (2, 'Neighbourhood Dash I', 2, 100, 'EASY', 0, 'DAY', 'Short, easy words. AI drives at 2 m/s over 100 m. No mistake penalty.'),
 (3, 'Park Loop I', 3, 100, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3 m/s over 100 m. Each mistake costs 0.5 m.'),
 (4, 'School Run I', 3.1, 110, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3.1 m/s over 110 m. Each mistake costs 0.5 m.'),
 (5, 'Village Sprint I', 3.2, 110, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3.2 m/s over 110 m. Each mistake costs 0.5 m.'),
 (6, 'Rookie Rally II', 3.3, 110, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3.3 m/s over 110 m. Each mistake costs 0.5 m.'),
 (7, 'Neighbourhood Dash II', 3.4, 120, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3.4 m/s over 120 m. Each mistake costs 0.5 m.'),
 (8, 'Park Loop II', 3.5, 120, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3.5 m/s over 120 m. Each mistake costs 0.5 m.'),
 (9, 'School Run II', 3.6, 120, 'EASY', 0.5, 'DAY', 'Short, easy words. AI drives at 3.6 m/s over 120 m. Each mistake costs 0.5 m.'),
 (10, 'Village Sprint II', 3.6, 130, 'NUMBERS', 0.5, 'DAY', 'Digits and numeric codes. AI drives at 3.6 m/s over 130 m. Each mistake costs 0.5 m.'),
 (11, 'Rookie Rally III', 3.7, 130, 'EASY', 0.5, 'NIGHT', 'Short, easy words. AI drives at 3.7 m/s over 130 m. Each mistake costs 0.5 m.'),
 (12, 'Neighbourhood Dash III', 3.8, 130, 'EASY', 0.5, 'NIGHT', 'Short, easy words. AI drives at 3.8 m/s over 130 m. Each mistake costs 0.5 m.'),
 (13, 'Park Loop III', 3.8, 130, 'EASY', 1, 'NIGHT', 'Short, easy words. AI drives at 3.8 m/s over 130 m. Each mistake costs 1 m.'),
 (14, 'School Run III', 3.9, 140, 'EASY', 1, 'NIGHT', 'Short, easy words. AI drives at 3.9 m/s over 140 m. Each mistake costs 1 m.'),
 (15, 'Village Sprint III', 4, 140, 'MIXED', 1, 'NIGHT', 'A mix of everything. AI drives at 4 m/s over 140 m. Each mistake costs 1 m.'),
 (16, 'Rookie Rally IV', 4, 140, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4 m/s over 140 m. Each mistake costs 1 m.'),
 (17, 'Neighbourhood Dash IV', 4.1, 140, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.1 m/s over 140 m. Each mistake costs 1 m.'),
 (18, 'Park Loop IV', 4.1, 150, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.1 m/s over 150 m. Each mistake costs 1 m.'),
 (19, 'School Run IV', 4.2, 150, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.2 m/s over 150 m. Each mistake costs 1 m.'),
 (20, 'Village Sprint IV', 4.3, 150, 'CAPITALS', 1, 'DAY', 'Capitalised words - master the Shift key. AI drives at 4.3 m/s over 150 m. Each mistake costs 1 m.'),
 (21, 'Rookie Rally V', 4.3, 150, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.3 m/s over 150 m. Each mistake costs 1 m.'),
 (22, 'Neighbourhood Dash V', 4.4, 150, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.4 m/s over 150 m. Each mistake costs 1 m.'),
 (23, 'Park Loop V', 4.4, 160, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.4 m/s over 160 m. Each mistake costs 1 m.'),
 (24, 'School Run V', 4.5, 160, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.5 m/s over 160 m. Each mistake costs 1 m.'),
 (25, 'Rookie Cup Final', 4.6, 160, 'EASY', 1, 'DAY', 'Short, easy words. AI drives at 4.6 m/s over 160 m. Each mistake costs 1 m. Chapter final!'),
 (26, 'Downtown Dash I', 4.6, 160, 'EASY', 1, 'NIGHT', 'Short, easy words. AI drives at 4.6 m/s over 160 m. Each mistake costs 1 m.'),
 (27, 'City Lights I', 4.7, 160, 'MEDIUM', 1, 'NIGHT', 'Everyday medium-length words. AI drives at 4.7 m/s over 160 m. Each mistake costs 1 m.'),
 (28, 'Harbour Bridge I', 4.7, 170, 'EASY', 1, 'NIGHT', 'Short, easy words. AI drives at 4.7 m/s over 170 m. Each mistake costs 1 m.'),
 (29, 'Metro Mile I', 4.8, 170, 'MEDIUM', 1, 'NIGHT', 'Everyday medium-length words. AI drives at 4.8 m/s over 170 m. Each mistake costs 1 m.'),
 (30, 'Skyline Sprint I', 4.8, 170, 'NUMBERS', 1, 'NIGHT', 'Digits and numeric codes. AI drives at 4.8 m/s over 170 m. Each mistake costs 1 m.'),
 (31, 'Downtown Dash II', 4.9, 170, 'MEDIUM', 1, 'NIGHT', 'Everyday medium-length words. AI drives at 4.9 m/s over 170 m. Each mistake costs 1 m.'),
 (32, 'City Lights II', 4.9, 170, 'EASY', 1, 'NIGHT', 'Short, easy words. AI drives at 4.9 m/s over 170 m. Each mistake costs 1 m.'),
 (33, 'Harbour Bridge II', 5, 180, 'MEDIUM', 1, 'NIGHT', 'Everyday medium-length words. AI drives at 5 m/s over 180 m. Each mistake costs 1 m.'),
 (34, 'Metro Mile II', 5.1, 180, 'EASY', 1, 'NIGHT', 'Short, easy words. AI drives at 5.1 m/s over 180 m. Each mistake costs 1 m.'),
 (35, 'Skyline Sprint II', 5.1, 180, 'MIXED', 1, 'NIGHT', 'A mix of everything. AI drives at 5.1 m/s over 180 m. Each mistake costs 1 m.'),
 (36, 'Downtown Dash III', 5.2, 180, 'EASY', 1, 'NEON', 'Short, easy words. AI drives at 5.2 m/s over 180 m. Each mistake costs 1 m.'),
 (37, 'City Lights III', 5.2, 180, 'MEDIUM', 1, 'NEON', 'Everyday medium-length words. AI drives at 5.2 m/s over 180 m. Each mistake costs 1 m.'),
 (38, 'Harbour Bridge III', 5.3, 190, 'EASY', 1.5, 'NEON', 'Short, easy words. AI drives at 5.3 m/s over 190 m. Each mistake costs 1.5 m.'),
 (39, 'Metro Mile III', 5.3, 190, 'MEDIUM', 1.5, 'NEON', 'Everyday medium-length words. AI drives at 5.3 m/s over 190 m. Each mistake costs 1.5 m.'),
 (40, 'Skyline Sprint III', 5.4, 190, 'CAPITALS', 1.5, 'NEON', 'Capitalised words - master the Shift key. AI drives at 5.4 m/s over 190 m. Each mistake costs 1.5 m.'),
 (41, 'Downtown Dash IV', 5.4, 190, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 5.4 m/s over 190 m. Each mistake costs 1.5 m.'),
 (42, 'City Lights IV', 5.5, 190, 'EASY', 1.5, 'NIGHT', 'Short, easy words. AI drives at 5.5 m/s over 190 m. Each mistake costs 1.5 m.'),
 (43, 'Harbour Bridge IV', 5.5, 190, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 5.5 m/s over 190 m. Each mistake costs 1.5 m.'),
 (44, 'Metro Mile IV', 5.6, 200, 'EASY', 1.5, 'NIGHT', 'Short, easy words. AI drives at 5.6 m/s over 200 m. Each mistake costs 1.5 m.'),
 (45, 'Skyline Sprint IV', 5.6, 200, 'PUNCTUATION', 1.5, 'NIGHT', 'Words with commas, periods and quotes. AI drives at 5.6 m/s over 200 m. Each mistake costs 1.5 m.'),
 (46, 'Downtown Dash V', 5.7, 200, 'EASY', 1.5, 'NIGHT', 'Short, easy words. AI drives at 5.7 m/s over 200 m. Each mistake costs 1.5 m.'),
 (47, 'City Lights V', 5.7, 200, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 5.7 m/s over 200 m. Each mistake costs 1.5 m.'),
 (48, 'Harbour Bridge V', 5.8, 200, 'EASY', 1.5, 'NIGHT', 'Short, easy words. AI drives at 5.8 m/s over 200 m. Each mistake costs 1.5 m.'),
 (49, 'Metro Mile V', 5.8, 200, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 5.8 m/s over 200 m. Each mistake costs 1.5 m.'),
 (50, 'Certification Grand Prix', 5.9, 210, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 5.9 m/s over 210 m. Each mistake costs 1.5 m. Win to earn your certificate!'),
 (51, 'Dune Runner I', 5.9, 210, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 5.9 m/s over 210 m. Each mistake costs 1.5 m.'),
 (52, 'Canyon Run I', 6, 210, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6 m/s over 210 m. Each mistake costs 1.5 m.'),
 (53, 'Mirage Mile I', 6, 210, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6 m/s over 210 m. Each mistake costs 1.5 m.'),
 (54, 'Oasis Loop I', 6.1, 210, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6.1 m/s over 210 m. Each mistake costs 1.5 m.'),
 (55, 'Sandstorm Sprint I', 6.1, 210, 'MIXED', 1.5, 'DESERT', 'A mix of everything. AI drives at 6.1 m/s over 210 m. Each mistake costs 1.5 m.'),
 (56, 'Dune Runner II', 6.1, 220, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6.1 m/s over 220 m. Each mistake costs 1.5 m.'),
 (57, 'Canyon Run II', 6.2, 220, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6.2 m/s over 220 m. Each mistake costs 1.5 m.'),
 (58, 'Mirage Mile II', 6.2, 220, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6.2 m/s over 220 m. Each mistake costs 1.5 m.'),
 (59, 'Oasis Loop II', 6.3, 220, 'MEDIUM', 1.5, 'DESERT', 'Everyday medium-length words. AI drives at 6.3 m/s over 220 m. Each mistake costs 1.5 m.'),
 (60, 'Sandstorm Sprint II', 6.3, 220, 'CAPITALS', 1.5, 'DESERT', 'Capitalised words - master the Shift key. AI drives at 6.3 m/s over 220 m. Each mistake costs 1.5 m.'),
 (61, 'Dune Runner III', 6.4, 220, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 6.4 m/s over 220 m. Each mistake costs 1.5 m.'),
 (62, 'Canyon Run III', 6.4, 230, 'MEDIUM', 1.5, 'NIGHT', 'Everyday medium-length words. AI drives at 6.4 m/s over 230 m. Each mistake costs 1.5 m.'),
 (63, 'Mirage Mile III', 6.5, 230, 'MEDIUM', 2, 'NIGHT', 'Everyday medium-length words. AI drives at 6.5 m/s over 230 m. Each mistake costs 2 m.'),
 (64, 'Oasis Loop III', 6.5, 230, 'MEDIUM', 2, 'NIGHT', 'Everyday medium-length words. AI drives at 6.5 m/s over 230 m. Each mistake costs 2 m.'),
 (65, 'Sandstorm Sprint III', 6.6, 230, 'PUNCTUATION', 2, 'NIGHT', 'Words with commas, periods and quotes. AI drives at 6.6 m/s over 230 m. Each mistake costs 2 m.'),
 (66, 'Dune Runner IV', 6.6, 230, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.6 m/s over 230 m. Each mistake costs 2 m.'),
 (67, 'Canyon Run IV', 6.7, 230, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.7 m/s over 230 m. Each mistake costs 2 m.'),
 (68, 'Mirage Mile IV', 6.7, 230, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.7 m/s over 230 m. Each mistake costs 2 m.'),
 (69, 'Oasis Loop IV', 6.8, 240, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.8 m/s over 240 m. Each mistake costs 2 m.'),
 (70, 'Sandstorm Sprint IV', 6.8, 240, 'NUMBERS', 2, 'DESERT', 'Digits and numeric codes. AI drives at 6.8 m/s over 240 m. Each mistake costs 2 m.'),
 (71, 'Dune Runner V', 6.8, 240, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.8 m/s over 240 m. Each mistake costs 2 m.'),
 (72, 'Canyon Run V', 6.9, 240, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.9 m/s over 240 m. Each mistake costs 2 m.'),
 (73, 'Mirage Mile V', 6.9, 240, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 6.9 m/s over 240 m. Each mistake costs 2 m.'),
 (74, 'Oasis Loop V', 7, 240, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 7 m/s over 240 m. Each mistake costs 2 m.'),
 (75, 'Desert King Final', 7, 250, 'MEDIUM', 2, 'DESERT', 'Everyday medium-length words. AI drives at 7 m/s over 250 m. Each mistake costs 2 m. Chapter final!'),
 (76, 'Frozen Track I', 7.1, 250, 'MEDIUM', 2, 'SNOW', 'Everyday medium-length words. AI drives at 7.1 m/s over 250 m. Each mistake costs 2 m.'),
 (77, 'Blizzard Bend I', 7.1, 250, 'HARD', 2, 'SNOW', 'Long, difficult words. AI drives at 7.1 m/s over 250 m. Each mistake costs 2 m.'),
 (78, 'Glacier Gap I', 7.2, 250, 'MEDIUM', 2, 'SNOW', 'Everyday medium-length words. AI drives at 7.2 m/s over 250 m. Each mistake costs 2 m.'),
 (79, 'Avalanche Alley I', 7.2, 250, 'HARD', 2, 'SNOW', 'Long, difficult words. AI drives at 7.2 m/s over 250 m. Each mistake costs 2 m.'),
 (80, 'Polar Pass I', 7.2, 250, 'CAPITALS', 2, 'SNOW', 'Capitalised words - master the Shift key. AI drives at 7.2 m/s over 250 m. Each mistake costs 2 m.'),
 (81, 'Frozen Track II', 7.3, 250, 'HARD', 2, 'SNOW', 'Long, difficult words. AI drives at 7.3 m/s over 250 m. Each mistake costs 2 m.'),
 (82, 'Blizzard Bend II', 7.3, 260, 'MEDIUM', 2, 'SNOW', 'Everyday medium-length words. AI drives at 7.3 m/s over 260 m. Each mistake costs 2 m.'),
 (83, 'Glacier Gap II', 7.4, 260, 'HARD', 2, 'SNOW', 'Long, difficult words. AI drives at 7.4 m/s over 260 m. Each mistake costs 2 m.'),
 (84, 'Avalanche Alley II', 7.4, 260, 'MEDIUM', 2, 'SNOW', 'Everyday medium-length words. AI drives at 7.4 m/s over 260 m. Each mistake costs 2 m.'),
 (85, 'Polar Pass II', 7.5, 260, 'PUNCTUATION', 2, 'SNOW', 'Words with commas, periods and quotes. AI drives at 7.5 m/s over 260 m. Each mistake costs 2 m.'),
 (86, 'Frozen Track III', 7.5, 260, 'MEDIUM', 2, 'NIGHT', 'Everyday medium-length words. AI drives at 7.5 m/s over 260 m. Each mistake costs 2 m.'),
 (87, 'Blizzard Bend III', 7.6, 260, 'HARD', 2, 'NIGHT', 'Long, difficult words. AI drives at 7.6 m/s over 260 m. Each mistake costs 2 m.'),
 (88, 'Glacier Gap III', 7.6, 260, 'MEDIUM', 2.5, 'NIGHT', 'Everyday medium-length words. AI drives at 7.6 m/s over 260 m. Each mistake costs 2.5 m.'),
 (89, 'Avalanche Alley III', 7.6, 270, 'HARD', 2.5, 'NIGHT', 'Long, difficult words. AI drives at 7.6 m/s over 270 m. Each mistake costs 2.5 m.'),
 (90, 'Polar Pass III', 7.7, 270, 'NUMBERS', 2.5, 'NIGHT', 'Digits and numeric codes. AI drives at 7.7 m/s over 270 m. Each mistake costs 2.5 m.'),
 (91, 'Frozen Track IV', 7.7, 270, 'HARD', 2.5, 'SNOW', 'Long, difficult words. AI drives at 7.7 m/s over 270 m. Each mistake costs 2.5 m.'),
 (92, 'Blizzard Bend IV', 7.8, 270, 'MEDIUM', 2.5, 'SNOW', 'Everyday medium-length words. AI drives at 7.8 m/s over 270 m. Each mistake costs 2.5 m.'),
 (93, 'Glacier Gap IV', 7.8, 270, 'HARD', 2.5, 'SNOW', 'Long, difficult words. AI drives at 7.8 m/s over 270 m. Each mistake costs 2.5 m.'),
 (94, 'Avalanche Alley IV', 7.9, 270, 'MEDIUM', 2.5, 'SNOW', 'Everyday medium-length words. AI drives at 7.9 m/s over 270 m. Each mistake costs 2.5 m.'),
 (95, 'Polar Pass IV', 7.9, 270, 'MIXED', 2.5, 'SNOW', 'A mix of everything. AI drives at 7.9 m/s over 270 m. Each mistake costs 2.5 m.'),
 (96, 'Frozen Track V', 7.9, 270, 'MEDIUM', 2.5, 'SNOW', 'Everyday medium-length words. AI drives at 7.9 m/s over 270 m. Each mistake costs 2.5 m.'),
 (97, 'Blizzard Bend V', 8, 280, 'HARD', 2.5, 'SNOW', 'Long, difficult words. AI drives at 8 m/s over 280 m. Each mistake costs 2.5 m.'),
 (98, 'Glacier Gap V', 8, 280, 'MEDIUM', 2.5, 'SNOW', 'Everyday medium-length words. AI drives at 8 m/s over 280 m. Each mistake costs 2.5 m.'),
 (99, 'Avalanche Alley V', 8.1, 280, 'HARD', 2.5, 'SNOW', 'Long, difficult words. AI drives at 8.1 m/s over 280 m. Each mistake costs 2.5 m.'),
 (100, 'Century Cup', 8.1, 280, 'HARD', 2.5, 'SNOW', 'Long, difficult words. AI drives at 8.1 m/s over 280 m. Each mistake costs 2.5 m. Chapter final!'),
 (101, 'Neon Boulevard I', 8.1, 280, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.1 m/s over 280 m. Each mistake costs 2.5 m.'),
 (102, 'Synthwave Strip I', 8.2, 280, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.2 m/s over 280 m. Each mistake costs 2.5 m.'),
 (103, 'Laser Lane I', 8.2, 280, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.2 m/s over 280 m. Each mistake costs 2.5 m.'),
 (104, 'Pixel Parkway I', 8.3, 290, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.3 m/s over 290 m. Each mistake costs 2.5 m.'),
 (105, 'Cyber Circuit I', 8.3, 290, 'PUNCTUATION', 2.5, 'NEON', 'Words with commas, periods and quotes. AI drives at 8.3 m/s over 290 m. Each mistake costs 2.5 m.'),
 (106, 'Neon Boulevard II', 8.4, 290, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.4 m/s over 290 m. Each mistake costs 2.5 m.'),
 (107, 'Synthwave Strip II', 8.4, 290, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.4 m/s over 290 m. Each mistake costs 2.5 m.'),
 (108, 'Laser Lane II', 8.4, 290, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.4 m/s over 290 m. Each mistake costs 2.5 m.'),
 (109, 'Pixel Parkway II', 8.5, 290, 'HARD', 2.5, 'NEON', 'Long, difficult words. AI drives at 8.5 m/s over 290 m. Each mistake costs 2.5 m.'),
 (110, 'Cyber Circuit II', 8.5, 290, 'NUMBERS', 2.5, 'NEON', 'Digits and numeric codes. AI drives at 8.5 m/s over 290 m. Each mistake costs 2.5 m.'),
 (111, 'Neon Boulevard III', 8.6, 290, 'HARD', 2.5, 'NIGHT', 'Long, difficult words. AI drives at 8.6 m/s over 290 m. Each mistake costs 2.5 m.'),
 (112, 'Synthwave Strip III', 8.6, 300, 'HARD', 2.5, 'NIGHT', 'Long, difficult words. AI drives at 8.6 m/s over 300 m. Each mistake costs 2.5 m.'),
 (113, 'Laser Lane III', 8.6, 300, 'HARD', 3, 'NIGHT', 'Long, difficult words. AI drives at 8.6 m/s over 300 m. Each mistake costs 3 m.'),
 (114, 'Pixel Parkway III', 8.7, 300, 'HARD', 3, 'NIGHT', 'Long, difficult words. AI drives at 8.7 m/s over 300 m. Each mistake costs 3 m.'),
 (115, 'Cyber Circuit III', 8.7, 300, 'MIXED', 3, 'NIGHT', 'A mix of everything. AI drives at 8.7 m/s over 300 m. Each mistake costs 3 m.'),
 (116, 'Neon Boulevard IV', 8.8, 300, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 8.8 m/s over 300 m. Each mistake costs 3 m.'),
 (117, 'Synthwave Strip IV', 8.8, 300, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 8.8 m/s over 300 m. Each mistake costs 3 m.'),
 (118, 'Laser Lane IV', 8.9, 300, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 8.9 m/s over 300 m. Each mistake costs 3 m.'),
 (119, 'Pixel Parkway IV', 8.9, 310, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 8.9 m/s over 310 m. Each mistake costs 3 m.'),
 (120, 'Cyber Circuit IV', 8.9, 310, 'CAPITALS', 3, 'NEON', 'Capitalised words - master the Shift key. AI drives at 8.9 m/s over 310 m. Each mistake costs 3 m.'),
 (121, 'Neon Boulevard V', 9, 310, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 9 m/s over 310 m. Each mistake costs 3 m.'),
 (122, 'Synthwave Strip V', 9, 310, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 9 m/s over 310 m. Each mistake costs 3 m.'),
 (123, 'Laser Lane V', 9.1, 310, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 9.1 m/s over 310 m. Each mistake costs 3 m.'),
 (124, 'Pixel Parkway V', 9.1, 310, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 9.1 m/s over 310 m. Each mistake costs 3 m.'),
 (125, 'Neon Crown Final', 9.1, 310, 'HARD', 3, 'NEON', 'Long, difficult words. AI drives at 9.1 m/s over 310 m. Each mistake costs 3 m. Chapter final!'),
 (126, 'Sunset Sprint I', 9.2, 310, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 9.2 m/s over 310 m. Each mistake costs 3 m.'),
 (127, 'Ocean Drive I', 9.2, 320, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.2 m/s over 320 m. Each mistake costs 3 m.'),
 (128, 'Palm Avenue I', 9.3, 320, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 9.3 m/s over 320 m. Each mistake costs 3 m.'),
 (129, 'Lighthouse Loop I', 9.3, 320, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.3 m/s over 320 m. Each mistake costs 3 m.'),
 (130, 'Tidal Turn I', 9.3, 320, 'NUMBERS', 3, 'SUNSET', 'Digits and numeric codes. AI drives at 9.3 m/s over 320 m. Each mistake costs 3 m.'),
 (131, 'Sunset Sprint II', 9.4, 320, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.4 m/s over 320 m. Each mistake costs 3 m.'),
 (132, 'Ocean Drive II', 9.4, 320, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 9.4 m/s over 320 m. Each mistake costs 3 m.'),
 (133, 'Palm Avenue II', 9.5, 320, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.5 m/s over 320 m. Each mistake costs 3 m.'),
 (134, 'Lighthouse Loop II', 9.5, 320, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 9.5 m/s over 320 m. Each mistake costs 3 m.'),
 (135, 'Tidal Turn II', 9.5, 330, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.5 m/s over 330 m. Each mistake costs 3 m.'),
 (136, 'Sunset Sprint III', 9.6, 330, 'HARD', 3, 'NIGHT', 'Long, difficult words. AI drives at 9.6 m/s over 330 m. Each mistake costs 3 m.'),
 (137, 'Ocean Drive III', 9.6, 330, 'MIXED', 3, 'NIGHT', 'A mix of everything. AI drives at 9.6 m/s over 330 m. Each mistake costs 3 m.'),
 (138, 'Palm Avenue III', 9.7, 330, 'HARD', 3, 'NIGHT', 'Long, difficult words. AI drives at 9.7 m/s over 330 m. Each mistake costs 3 m.'),
 (139, 'Lighthouse Loop III', 9.7, 330, 'MIXED', 3, 'NIGHT', 'A mix of everything. AI drives at 9.7 m/s over 330 m. Each mistake costs 3 m.'),
 (140, 'Tidal Turn III', 9.7, 330, 'CAPITALS', 3, 'NIGHT', 'Capitalised words - master the Shift key. AI drives at 9.7 m/s over 330 m. Each mistake costs 3 m.'),
 (141, 'Sunset Sprint IV', 9.8, 330, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.8 m/s over 330 m. Each mistake costs 3 m.'),
 (142, 'Ocean Drive IV', 9.8, 330, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 9.8 m/s over 330 m. Each mistake costs 3 m.'),
 (143, 'Palm Avenue IV', 9.8, 330, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 9.8 m/s over 330 m. Each mistake costs 3 m.'),
 (144, 'Lighthouse Loop IV', 9.9, 340, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 9.9 m/s over 340 m. Each mistake costs 3 m.'),
 (145, 'Tidal Turn IV', 9.9, 340, 'PUNCTUATION', 3, 'SUNSET', 'Words with commas, periods and quotes. AI drives at 9.9 m/s over 340 m. Each mistake costs 3 m.'),
 (146, 'Sunset Sprint V', 10, 340, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 10 m/s over 340 m. Each mistake costs 3 m.'),
 (147, 'Ocean Drive V', 10, 340, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 10 m/s over 340 m. Each mistake costs 3 m.'),
 (148, 'Palm Avenue V', 10, 340, 'HARD', 3, 'SUNSET', 'Long, difficult words. AI drives at 10 m/s over 340 m. Each mistake costs 3 m.'),
 (149, 'Lighthouse Loop V', 10.1, 340, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 10.1 m/s over 340 m. Each mistake costs 3 m.'),
 (150, 'Coastal Championship', 10.1, 340, 'MIXED', 3, 'SUNSET', 'A mix of everything. AI drives at 10.1 m/s over 340 m. Each mistake costs 3 m. Chapter final!'),
 (151, 'Eagle Ridge I', 10.2, 340, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.2 m/s over 340 m. Each mistake costs 3 m.'),
 (152, 'Thunder Pass I', 10.2, 350, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.2 m/s over 350 m. Each mistake costs 3 m.'),
 (153, 'Summit Climb I', 10.2, 350, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.2 m/s over 350 m. Each mistake costs 3 m.'),
 (154, 'Pine Valley I', 10.3, 350, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.3 m/s over 350 m. Each mistake costs 3 m.'),
 (155, 'Cliffside Curve I', 10.3, 350, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.3 m/s over 350 m. Each mistake costs 3 m.'),
 (156, 'Eagle Ridge II', 10.4, 350, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.4 m/s over 350 m. Each mistake costs 3 m.'),
 (157, 'Thunder Pass II', 10.4, 350, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.4 m/s over 350 m. Each mistake costs 3 m.'),
 (158, 'Summit Climb II', 10.4, 350, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.4 m/s over 350 m. Each mistake costs 3 m.'),
 (159, 'Pine Valley II', 10.5, 350, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.5 m/s over 350 m. Each mistake costs 3 m.'),
 (160, 'Cliffside Curve II', 10.5, 350, 'CAPITALS', 3, 'DAY', 'Capitalised words - master the Shift key. AI drives at 10.5 m/s over 350 m. Each mistake costs 3 m.'),
 (161, 'Eagle Ridge III', 10.5, 360, 'EXPERT', 3, 'NIGHT', 'Expert vocabulary with tricky spellings. AI drives at 10.5 m/s over 360 m. Each mistake costs 3 m.'),
 (162, 'Thunder Pass III', 10.6, 360, 'MIXED', 3, 'NIGHT', 'A mix of everything. AI drives at 10.6 m/s over 360 m. Each mistake costs 3 m.'),
 (163, 'Summit Climb III', 10.6, 360, 'EXPERT', 3, 'NIGHT', 'Expert vocabulary with tricky spellings. AI drives at 10.6 m/s over 360 m. Each mistake costs 3 m.'),
 (164, 'Pine Valley III', 10.7, 360, 'MIXED', 3, 'NIGHT', 'A mix of everything. AI drives at 10.7 m/s over 360 m. Each mistake costs 3 m.'),
 (165, 'Cliffside Curve III', 10.7, 360, 'PUNCTUATION', 3, 'NIGHT', 'Words with commas, periods and quotes. AI drives at 10.7 m/s over 360 m. Each mistake costs 3 m.'),
 (166, 'Eagle Ridge IV', 10.7, 360, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.7 m/s over 360 m. Each mistake costs 3 m.'),
 (167, 'Thunder Pass IV', 10.8, 360, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.8 m/s over 360 m. Each mistake costs 3 m.'),
 (168, 'Summit Climb IV', 10.8, 360, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 10.8 m/s over 360 m. Each mistake costs 3 m.'),
 (169, 'Pine Valley IV', 10.8, 370, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.8 m/s over 370 m. Each mistake costs 3 m.'),
 (170, 'Cliffside Curve IV', 10.9, 370, 'NUMBERS', 3, 'DAY', 'Digits and numeric codes. AI drives at 10.9 m/s over 370 m. Each mistake costs 3 m.'),
 (171, 'Eagle Ridge V', 10.9, 370, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 10.9 m/s over 370 m. Each mistake costs 3 m.'),
 (172, 'Thunder Pass V', 11, 370, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 11 m/s over 370 m. Each mistake costs 3 m.'),
 (173, 'Summit Climb V', 11, 370, 'EXPERT', 3, 'DAY', 'Expert vocabulary with tricky spellings. AI drives at 11 m/s over 370 m. Each mistake costs 3 m.'),
 (174, 'Pine Valley V', 11, 370, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 11 m/s over 370 m. Each mistake costs 3 m.'),
 (175, 'Mountain Master Final', 11.1, 370, 'MIXED', 3, 'DAY', 'A mix of everything. AI drives at 11.1 m/s over 370 m. Each mistake costs 3 m. Chapter final!'),
 (176, 'Champion''s Circuit I', 11.1, 370, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.1 m/s over 370 m. Each mistake costs 3 m.'),
 (177, 'Titan Track I', 11.1, 370, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.1 m/s over 370 m. Each mistake costs 3 m.'),
 (178, 'Legend Loop I', 11.2, 380, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.2 m/s over 380 m. Each mistake costs 3 m.'),
 (179, 'Hall of Fame Highway I', 11.2, 380, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.2 m/s over 380 m. Each mistake costs 3 m.'),
 (180, 'Grand Master Mile I', 11.3, 380, 'CAPITALS', 3, 'NEON', 'Capitalised words - master the Shift key. AI drives at 11.3 m/s over 380 m. Each mistake costs 3 m.'),
 (181, 'Champion''s Circuit II', 11.3, 380, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.3 m/s over 380 m. Each mistake costs 3 m.'),
 (182, 'Titan Track II', 11.3, 380, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.3 m/s over 380 m. Each mistake costs 3 m.'),
 (183, 'Legend Loop II', 11.4, 380, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.4 m/s over 380 m. Each mistake costs 3 m.'),
 (184, 'Hall of Fame Highway II', 11.4, 380, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.4 m/s over 380 m. Each mistake costs 3 m.'),
 (185, 'Grand Master Mile II', 11.4, 380, 'PUNCTUATION', 3, 'NEON', 'Words with commas, periods and quotes. AI drives at 11.4 m/s over 380 m. Each mistake costs 3 m.'),
 (186, 'Champion''s Circuit III', 11.5, 380, 'EXPERT', 3, 'NIGHT', 'Expert vocabulary with tricky spellings. AI drives at 11.5 m/s over 380 m. Each mistake costs 3 m.'),
 (187, 'Titan Track III', 11.5, 390, 'EXPERT', 3, 'NIGHT', 'Expert vocabulary with tricky spellings. AI drives at 11.5 m/s over 390 m. Each mistake costs 3 m.'),
 (188, 'Legend Loop III', 11.6, 390, 'EXPERT', 3, 'NIGHT', 'Expert vocabulary with tricky spellings. AI drives at 11.6 m/s over 390 m. Each mistake costs 3 m.'),
 (189, 'Hall of Fame Highway III', 11.6, 390, 'EXPERT', 3, 'NIGHT', 'Expert vocabulary with tricky spellings. AI drives at 11.6 m/s over 390 m. Each mistake costs 3 m.'),
 (190, 'Grand Master Mile III', 11.6, 390, 'NUMBERS', 3, 'NIGHT', 'Digits and numeric codes. AI drives at 11.6 m/s over 390 m. Each mistake costs 3 m.'),
 (191, 'Champion''s Circuit IV', 11.7, 390, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.7 m/s over 390 m. Each mistake costs 3 m.'),
 (192, 'Titan Track IV', 11.7, 390, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.7 m/s over 390 m. Each mistake costs 3 m.'),
 (193, 'Legend Loop IV', 11.7, 390, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.7 m/s over 390 m. Each mistake costs 3 m.'),
 (194, 'Hall of Fame Highway IV', 11.8, 390, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.8 m/s over 390 m. Each mistake costs 3 m.'),
 (195, 'Grand Master Mile IV', 11.8, 390, 'MIXED', 3, 'NEON', 'A mix of everything. AI drives at 11.8 m/s over 390 m. Each mistake costs 3 m.'),
 (196, 'Champion''s Circuit V', 11.9, 400, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.9 m/s over 400 m. Each mistake costs 3 m.'),
 (197, 'Titan Track V', 11.9, 400, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.9 m/s over 400 m. Each mistake costs 3 m.'),
 (198, 'Legend Loop V', 11.9, 400, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 11.9 m/s over 400 m. Each mistake costs 3 m.'),
 (199, 'Hall of Fame Highway V', 12, 400, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 12 m/s over 400 m. Each mistake costs 3 m.'),
 (200, 'TypeMaster Grand Final', 12, 400, 'EXPERT', 3, 'NEON', 'Expert vocabulary with tricky spellings. AI drives at 12 m/s over 400 m. Each mistake costs 3 m. Chapter final!')
ON DUPLICATE KEY UPDATE name = VALUES(name), ai_speed = VALUES(ai_speed), distance_meters = VALUES(distance_meters),
  word_pool = VALUES(word_pool), mistake_penalty = VALUES(mistake_penalty), theme = VALUES(theme), challenge = VALUES(challenge);
