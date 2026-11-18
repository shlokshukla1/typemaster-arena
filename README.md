# TypeMaster Arena ⌨️🏎️

A full-stack typing game platform: **10 typing games**, a **200-level AI car racing challenge** (8 chapters) with level unlocking and a **downloadable certificate at level 50**, a live **typing statistics dashboard**, a **typing practice** section with an on-screen keyboard, and a **global leaderboard**.

- **Backend:** Java 17+, Spring Boot 3.3, Spring Data JPA, Bean Validation, BCrypt, Maven
- **Database:** MySQL 8 (plus an optional in-memory H2 profile for quick demos)
- **Frontend:** HTML5, CSS3, vanilla JavaScript (no build step), Canvas, Web Audio API
- **Design:** responsive dark gaming UI (desktop, tablet, mobile)

Guests can play everything immediately; progress is saved in the browser (`localStorage`). Logging in stores scores, statistics and racing progress in MySQL and puts you on the online leaderboard. Guest progress is merged into the account on login.

---

## 1. Quick start

### Requirements
| Tool | Version |
|---|---|
| JDK | 17 or newer (tested with 21) |
| Maven | 3.8+ (or the one bundled with IntelliJ) |
| MySQL | 8.x (not needed for the H2 demo profile) |

### Option A – run with MySQL (full features)
1. Start MySQL.
2. Set your MySQL credentials. Either edit `src/main/resources/application.properties`:
   ```properties
   spring.datasource.username=root
   spring.datasource.password=your_password
   ```
   or set environment variables `DB_USERNAME`, `DB_PASSWORD` (and optionally `DB_URL`).
3. Run:
   ```bash
   mvn spring-boot:run
   ```
4. Open **http://localhost:8080**

The database `typemaster_arena` and all tables are created automatically (`createDatabaseIfNotExist=true`, `ddl-auto=update`) and the 200 racing levels are seeded at startup. If you prefer to create the schema yourself, run `database/schema.sql`:
```bash
mysql -u root -p < database/schema.sql
```

### Option B – quick demo without MySQL (in-memory H2)
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```
Everything works, but data is lost when the server stops.

### Build a runnable jar
```bash
mvn clean package
java -jar target/typemaster-arena-1.0.0.jar                         # MySQL
java -jar target/typemaster-arena-1.0.0.jar --spring.profiles.active=h2   # H2 demo
```

---

## 2. Running in an IDE

### IntelliJ IDEA
1. **File → Open…** and select the project folder (the one containing `pom.xml`). IntelliJ imports it as a Maven project.
2. **File → Project Structure → Project SDK**: choose JDK 17+.
3. Configure MySQL credentials in `application.properties` (see above).
4. Open `src/main/java/com/typemaster/arena/TypeMasterArenaApplication.java` and click the green ▶ next to `main`.
   - For the H2 demo: **Run → Edit Configurations → Active profiles:** `h2`.
5. Browse to http://localhost:8080.

### VS Code
1. Install the **Extension Pack for Java** and **Spring Boot Extension Pack**.
2. **File → Open Folder…** → the project folder. Wait until the Java projects finish importing.
3. Configure MySQL credentials in `application.properties`.
4. Open the **Spring Boot Dashboard** (side bar) and start `typemaster-arena`, or run in the terminal:
   ```bash
   mvn spring-boot:run
   ```
5. Browse to http://localhost:8080.

> Tip: the frontend is plain static files, so you can also open it with **Live Server** (port 5500) while Spring Boot runs on 8080 – the JavaScript automatically calls `http://localhost:8080/api` in that case (CORS is enabled for localhost).

---

## 3. MySQL configuration details

| Property | Default | Env var |
|---|---|---|
| `spring.datasource.url` | `jdbc:mysql://localhost:3306/typemaster_arena?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC` | `DB_URL` |
| `spring.datasource.username` | `root` | `DB_USERNAME` |
| `spring.datasource.password` | `root` | `DB_PASSWORD` |
| `spring.jpa.hibernate.ddl-auto` | `update` | – |
| `app.auth.token-days` | `30` (login token lifetime) | – |

Using a dedicated user (recommended):
```sql
CREATE USER 'typemaster'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON typemaster_arena.* TO 'typemaster'@'localhost';
```

### Tables
`users`, `game_scores`, `typing_statistics`, `racing_levels`, `user_level_progress`, `leaderboard`, `game_history` – see `database/schema.sql` for the full DDL and relationships:

```
users 1──* game_scores
users 1──1 typing_statistics
users 1──1 leaderboard
users 1──* game_history
users 1──* user_level_progress *──1 racing_levels
```

---

## 4. The games

| # | Game | What it trains |
|---|---|---|
| 1 | **AI Car Racing Challenge** (main game) | Sustained speed + accuracy. 200 levels in 8 chapters, unlock system, stars, certificate at level 50, countdown, victory animation, 6 track themes |
| 2 | Speed Typing Challenge | 30 / 60 / 120-second timed sentence typing with live WPM |
| 3 | Word Typing Challenge | Single words with per-word timers, levels, combos, 3 lives |
| 4 | Falling Words | Type words before they hit the ground; speed rises with score |
| 5 | Zombie Typing Attack | Waves of zombies, boss every 5th wave, 4 difficulties, sound FX |
| 6 | Bubble Typing | Pop rising bubbles, combos, golden time-bonus bubbles, 60/90/120 s |
| 7 | Paragraph Typing Practice | Beginner / intermediate / advanced paragraphs with char highlighting |
| 8 | Code Typing Challenge | Java, JavaScript, HTML, CSS and Python snippets (Enter + auto-indent) |
| 9 | Number Typing Challenge | Numbers, decimals, phone numbers, sequences and sums against a countdown |
| 10 | Survival Typing Challenge | Draining energy bar, 10-strike limit, levels get faster |

Plus the **Typing Practice** section: beginner (home row), intermediate, advanced, English paragraph, random words, sentences and custom text – with an on-screen keyboard highlighting the next key (and Shift), colour-coded by finger.

Every game has: instructions before starting, options, a 3-2-1-GO countdown, pause/resume (button or `Esc`, auto-pause when the tab is hidden), restart, sound on/off, a live statistics panel and a results screen.

### AI Car Racing rules
- Your car moves **1 m per correctly typed character**; consecutive error-free words add a streak bonus of up to +20 %.
- Wrong keystrokes are **rejected** (they never count as correct), reset the streak and – from level 3 – push your car back by the level's penalty.
- The AI moves at a **constant** speed: level 1 = 1 m/s, level 2 = 2 m/s, level 3 = 3 m/s, then a smooth curve up to 12 m/s at level 200 (about 62 WPM needed at level 50, 85 at level 100, 125 at level 200). Track length grows from 90 m to 400 m and the mistake penalty from 0 to 3 m.
- **8 chapters x 25 levels:** Rookie Circuit, City Grand Prix, Desert Rally, Frozen Peaks, Neon Nights, Coastal Highway, Mountain Pass, Legends League. Every 5th level uses a special word set (capitals, punctuation, numbers, mixed) and every 25th level is a chapter final.
- **Certificate:** winning level 50 earns the official TypeMaster Arena certificate (name, date, certificate ID, best speed, accuracy, stars). It can be downloaded as PNG or printed / saved as PDF from the Racing Challenge page or the level-50 results screen.
- Each level has its own challenge (word pool: easy/medium/hard/expert/capitals/punctuation/numbers/mixed, penalty and theme).
- Win → next level unlocks. Stars: 1 for winning, 2 with ≥ 90 % accuracy, 3 with ≥ 96 % accuracy and a ≥ 15 % lead.
- Locked levels show a lock icon and cannot be started (enforced on the server too – HTTP 403).

### Statistics formulas
```
Gross WPM = (all typed characters / 5) / minutes
Accuracy  = correct characters / all typed characters × 100
Net WPM   = Gross WPM × Accuracy / 100        e.g. 20 WPM × 90 % = 18 Net WPM
```
Each keystroke is judged once when it is typed: a mistake that is later corrected with Backspace still counts as one incorrect character. The server recomputes Net WPM from gross WPM and accuracy before saving.

---

## 5. REST API

All responses are JSON. Authenticated endpoints need `Authorization: Bearer <token>` (returned by register/login).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{username, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | – | `{login (username or email), password}` → `{token, user}` |
| POST | `/api/auth/logout` | ✔ | Invalidates the token |
| GET | `/api/auth/me` | ✔ | Current user |
| POST | `/api/scores` | ✔ | Save a finished game (updates scores, history, statistics, leaderboard) |
| GET | `/api/stats/me` | ✔ | Lifetime typing statistics |
| GET | `/api/stats/global` | – | Site-wide numbers for the homepage |
| GET | `/api/history/me?page=0&size=20` | ✔ | Paged game history |
| GET | `/api/racing/levels` | – | The 200 level definitions |
| GET | `/api/racing/progress` | ✔ | Unlocked / completed levels, stars, bests |
| POST | `/api/racing/progress` | ✔ | Save a race result; unlocks the next level on a win |
| POST | `/api/racing/progress/sync` | ✔ | Merge guest (localStorage) progress after login |
| GET | `/api/leaderboard?sort=wpm\|accuracy\|racing\|levels\|score&limit=10` | – | Top players |

Errors use one format: `{status, error, message, fieldErrors, timestamp}` (400 validation, 401 login required, 403 locked level, 404, 409 duplicate user).

Example:
```bash
curl -X POST localhost:8080/api/auth/register -H "Content-Type: application/json" \
     -d '{"username":"racer","email":"racer@example.com","password":"secret123"}'
```

---

## 6. Project structure

```
typemaster-arena/
├── pom.xml
├── README.md
├── database/schema.sql                    MySQL DDL + level seed
└── src/main/
    ├── java/com/typemaster/arena/
    │   ├── TypeMasterArenaApplication.java
    │   ├── controller/   AuthController, ScoreController, StatisticsController,
    │   │                 RacingController, LeaderboardController, PageController
    │   ├── service/      AuthService, ScoreService, StatisticsService,
    │   │                 RacingService, LeaderboardService
    │   ├── repository/   Spring Data JPA repositories (one per entity)
    │   ├── entity/       User, GameScore, TypingStatistics, RacingLevel,
    │   │                 UserLevelProgress, LeaderboardEntry, GameHistory, GameType
    │   ├── dto/          request/response records
    │   ├── config/       WebConfig (CORS, @CurrentUser), SecurityConfig (BCrypt),
    │   │                 CurrentUser + resolver, DataInitializer (level seeding)
    │   └── exception/    ApiException, ResourceNotFoundException,
    │                     UnauthorizedException, GlobalExceptionHandler
    └── resources/
        ├── application.properties         MySQL (default)
        ├── application-h2.properties      in-memory demo profile
        ├── templates/index.html           single-page app shell
        └── static/
            ├── css/style.css
            ├── images/logo.svg
            └── js/
                ├── core/    util (DOM, toasts, modal, localStorage), sound (Web Audio),
                │            api (REST client + auth), stats (WPM tracker, live panel,
                │            daily challenges), typer (typing engines), keyboard, shell (game framework)
                ├── data/    words.js (word pools, sentences, paragraphs, code), levels.js
                ├── games/   racing.js, text-games.js, word-games.js
                ├── pages/   pages.js (home, games, racing levels, practice, leaderboard,
                │            progress dashboard, login/register modal)
                └── app.js   hash router + navbar
```

### Frontend architecture
- `GameShell` (`core/shell.js`) gives every game the same lifecycle: instructions → countdown → play → pause/resume/restart → results → save (localStorage, and the API when logged in).
- `TextTyper` handles passage typing with per-character highlighting; `bindWordInput` judges every keystroke for word games (either rejecting wrong keys or marking them red).
- `StatsTracker` measures active typing time only (paused time is excluded).
- Sounds are synthesised with the Web Audio API – no audio files; the mute setting is remembered.

---

## 7. Admin panel

An admin account is created automatically at first startup:

| Setting | Default | Env var |
|---|---|---|
| `app.admin.username` | `admin` | `ADMIN_USERNAME` |
| `app.admin.password` | `Admin@123` | `ADMIN_PASSWORD` |
| `app.admin.email` | `admin@typemaster.local` | `ADMIN_EMAIL` |

**Change the password before putting the site online** (set `ADMIN_PASSWORD`, or edit `application.properties` before the first start). If a user with the admin username already exists, it is promoted to ADMIN and keeps its password.

Log in with the admin account and click **🛡 Admin** in the menu (or open `http://localhost:8080/#/admin`). The panel shows:

- **Users:** total users, new today / last 7 days, active players today
- **Traffic:** online now (heartbeat within 2 minutes), visitors and page views today and all time, a 7/14/30-day traffic chart with hover tooltips and a table view
- **Games:** games played today and all time (guests included), games per day, most played games, certificates issued
- **All users & progress:** search by username/email, sort by newest / levels / WPM / games, racing progress bar (x/200, current level), stars, best WPM, accuracy, certificate status; click a user for full stats, best score per game and recent games

Traffic tracking is anonymous: the browser keeps a random id in localStorage; no IP addresses or cookies are stored.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/overview` | Headline numbers |
| GET | `/api/admin/traffic?days=14` | Daily page views, unique visitors, games, sign-ups |
| GET | `/api/admin/games` | Plays per game |
| GET | `/api/admin/users?q=&sort=newest\|levels\|wpm\|games&page=0&size=20` | Users with progress |
| GET | `/api/admin/users/{id}` | One user's details |
| POST | `/api/track/visit` / `ping` / `game` | Anonymous tracking (public) |

All `/api/admin/**` endpoints return 401 without login and 403 for non-admin users.

## 8. Notes
- Passwords are hashed with BCrypt; login issues a random 256-bit bearer token (30-day expiry).
- Server-side validation caps WPM at 400 and enforces level unlock order.
- Daily challenges (3 per day) are generated from the date, so everyone gets the same ones.
- Reset guest data any time from **My Progress → Reset local data**.
