/* =====================================================================
 * TypeMaster Arena - text content used by all games
 * Word pools, sentences, paragraphs (3 difficulties) and code snippets.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const split = (s) => s.trim().split(/\s+/);

  const EASY = split(`
    the and you that was for are with his they this have from one had word but not what all
    were when your can said there use each which she how their will other about out many then
    them these some her would make like him into time has look two more write see number way
    could people than first water been call who oil its now find long down day did get come made
    may part over new sound take only little work know place year live back give most very after
    thing our just name good man think say great where help through much before line right too
    mean old any same tell boy follow came want show also around form three small set put end does
    another well large must big even such because turn here why ask went men read need land
    different home us move try kind hand picture again change off play spell air away animal house
    point page letter mother answer found study still learn should world high every near add food
    between own below country plant last school father keep tree never start city earth eye light
    thought head under story saw left few while along might close something seem next hard open
    example begin life always those both paper together got group often run important until
    children side feet car mile night walk white sea began grow took river four carry state once
    book hear stop without second later miss idea enough eat face watch far real almost let above
    girl sometimes mountain cut young talk soon list song being leave family fast cat dog sun fun
  `);

  const MEDIUM = split(`
    ability absolute academy account achieve acquire adapter address advance adventure advice
    airport alcohol amazing ancient another anxiety anybody apartment apparent approach article
    attempt attitude audience authority average balance battery bedroom believe benefit biology
    blanket brother budget building cabinet calendar campaign capable capture careful category
    ceiling century chapter charity chicken circuit citizen classic climate clothes collect college
    comfort command comment company compare complex concept concert conduct confirm connect
    consider contact content contest context control convert correct cottage counter country
    courage cousin crystal culture current customer dancing decade decision defense delivery
    deposit desktop develop diamond digital dinner direct discover display distance document
    economy edition element emotion empire energy engine evening exactly example explain express
    factory fashion feature finance fitness foreign forever formula fortune forward freedom
    gallery garden general genuine gesture glacier glimpse gravity guitar habitat harmony harvest
    heading healthy history holiday horizon however hundred husband imagine improve include
    initial inquiry insight install instance journey justice kitchen language laptop leather
    lecture library machine manager marble measure medical meeting message million minimum
    mission mistake mixture monitor morning musical mystery natural network nothing obvious
    officer opinion orchard organic outdoor package painting parking partner passage patient
    pattern payment penalty perfect perhaps picture planet plastic pleasure pocket popular
    portion poverty premium present primary printer privacy problem process product program
    project promise protect provide purpose quality quarter question rainbow reality receipt
    recover reflect regular release request respect revenue rocket routine running science
    section serious session shelter silence similar soldier speaker special station student
    subject success summary support surface teacher theater thunder tonight traffic transit
    trouble uniform unknown upgrade useful variety vehicle venture version victory village
    vintage visible weather website wedding weekend welcome western whisper window winter
    wonder worker writing yourself
  `);

  const HARD = split(`
    abbreviation absolutely accelerate accommodate accomplishment acknowledge acquaintance
    administration advertisement aerodynamic algorithm alphabetical ambiguous amphitheater
    anniversary anonymous antibiotic apparatus appreciation archaeology architecture arithmetic
    astronomical atmosphere authentication autobiography bibliography biodiversity bureaucracy
    calculation catastrophe characteristic chronological circumference collaboration combination
    commemorate communication comprehensive concentration configuration conscientious
    consequence considerable constellation contemporary controversial correspondence
    cryptography curriculum declaration demonstration descendant determination development
    dictionary disappointment discrimination documentation electricity encyclopedia
    entrepreneur environment equilibrium establishment evaporation exaggerate exceptional
    experimental extraordinary fascinating fluorescent fundamental geographical government
    hallucination hemisphere hierarchy hypothesis identification illuminate immediately
    implementation independence infrastructure inheritance innovation instrumental intelligence
    interpretation investigation jurisdiction kaleidoscope knowledgeable laboratory legislation
    magnificent maintenance manufacturer mathematical mechanism metamorphosis microprocessor
    millennium miscellaneous mysterious necessarily neighborhood nevertheless observatory
    occasionally opportunity orchestration organization parliament particularly performance
    perpendicular perseverance pharmaceutical philosophy photosynthesis precipitation
    preliminary professional pronunciation psychological questionnaire recommendation
    refrigerator rehabilitation relationship renaissance representative responsibility
    restaurant revolutionary satellite scholarship simultaneous sophisticated spectacular
    statistics subscription sufficient surveillance sustainability synchronization
    temperature territory thermometer transformation transparency unbelievable undoubtedly
    unprecedented vocabulary vulnerability wholehearted
  `);

  const EXPERT = split(`
    acquiescence anesthesiologist antidisestablishment bourgeoisie bureaucratization
    chrysanthemum circumlocution compartmentalize conscientiousness counterintuitive
    deoxyribonucleic electroencephalogram entrepreneurship extemporaneous floccinaucinihilipilification
    gastroenterology handkerchief hippopotamus idiosyncrasy incomprehensibility indefatigable
    individualization interchangeability internationalization juxtaposition labyrinthine
    lackadaisical liquefaction magnanimous mischievous misinterpretation nomenclature
    obsequious onomatopoeia otorhinolaryngology parallelogram perspicacious phenomenological
    pneumatic pseudonym psychoanalysis quintessential reconnaissance rhythmically sacrilegious
    schizophrenia serendipitous sesquipedalian silhouette solicitousness supercalifragilistic
    surreptitious thermodynamics transcontinental unconstitutional uncharacteristically
    ventriloquist verisimilitude weatherization xylophone zealousness accommodation
    bougainvillea connoisseur conscientious embarrassment exhilarating fuchsia gauge
    harassment hemorrhage liaison maneuver millennium mnemonic occurrence playwright
    questionnaire rhythm sacrilegious threshold unnecessary vacuum
  `);

  // Capitalised words (proper nouns etc.) - exercises the Shift key.
  const CAPITALS = split(`
    London Paris Tokyo Berlin Madrid Rome Cairo Sydney Toronto Mumbai Delhi Beijing Moscow
    Dubai Lisbon Vienna Prague Oslo Dublin Athens Seoul Lagos Nairobi Lima Bogota Quito
    January February March April June July August September October November December
    Monday Tuesday Wednesday Thursday Friday Saturday Sunday Java Python Spring Linux GitHub
    Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune Pluto Amazon Nile Sahara Everest
    Atlantic Pacific Arctic Europe Asia Africa America Oceania Antarctica Ferrari Porsche
    TypeMaster Champion Racer Turbo Nitro Thunder Phoenix Dragon Falcon Tiger Eagle Comet
  `);

  // Words carrying punctuation.
  const PUNCTUATION = split(`
    hello, world. really? yes! okay, fine. wait... don't can't won't it's we're they're
    "quote" (note) [list] {block} end; start: first, second, third. why? because!
    e-mail self-made well-known up-to-date x-ray re-entry user@mail.com 50% $20 #1 &more
    time: now; ready, set, go! stop. look: here. right? left! done; next, then. "yes," maybe.
    one-two (three) four; five: six, seven. eight? nine! ten... you'll I'm she's he'd
  `);

  // Number-heavy tokens.
  const NUMBERS = split(`
    2024 1999 42 3.14 100 250 7 365 24/7 9:30 12:45 06:00 1,000 5,280 99.9 0.5 1/2 3/4
    404 500 8080 192.168 10.0 A1 B2 C3 R2D2 V8 F1 4x4 360 720 1080 4K 5G 3D 2FA 101 911
    car42 lap3 gear5 pit12 turn7 sector2 km88 mph120 rpm7000 code9 x99 zone51 level10
  `);

  const SENTENCES = [
    'The quick brown fox jumps over the lazy dog.',
    'Practice makes progress, and progress makes perfect.',
    'Typing fast is good, but typing accurately is even better.',
    'A journey of a thousand miles begins with a single step.',
    'Every great developer started by writing their very first line of code.',
    'Keep your fingers on the home row and your eyes on the screen.',
    'The racing car roared down the track as the crowd cheered loudly.',
    'Small daily improvements lead to stunning long term results.',
    'Bright stars filled the night sky above the quiet mountain village.',
    'Learning to type without looking at the keyboard saves hours every week.',
    'The best way to predict the future is to create it yourself.',
    'She sells sea shells by the sea shore every summer morning.',
    'Fresh coffee and a clean desk make Monday mornings much easier.',
    'Good communication is the bridge between confusion and clarity.',
    'The library was silent except for the soft turning of pages.',
    'Technology changes quickly, but curiosity never goes out of style.',
    'A calm mind types faster than a hurried one.',
    'The storm passed and a bright rainbow appeared over the hills.',
    'Consistency beats intensity when you are building a new skill.',
    'Our team finished the project two days ahead of schedule.',
    'He packed his bag, locked the door, and walked to the station.',
    'Reading every day expands your vocabulary and your imagination.',
    'The chef added a pinch of salt and a splash of lemon juice.',
    'Winners are simply people who refused to give up too early.',
    'Rivers carve valleys slowly, one grain of sand at a time.',
    'Turn off distractions and focus on one task at a time.',
    'The old lighthouse guided ships safely through the foggy night.',
    'Accuracy first, speed second, and confidence will follow.',
    'Music, art and science all reward patient practice.',
    'Clear goals make it easier to measure real progress.',
    'The museum opened a new exhibit about ancient civilizations.',
    'Strong passwords protect your accounts from unwanted visitors.',
    'Fast fingers win races, but steady fingers win championships.',
    'The garden was full of tomatoes, peppers and sunflowers.',
    'Breathe slowly, relax your shoulders, and keep typing.',
    'Every mistake is a lesson that makes the next attempt better.',
    'The train arrived exactly on time despite the heavy snow.',
    'Curious minds ask questions that others never think about.',
    'Water the plants, feed the cat, and remember to call home.',
    'Great things never come from comfort zones.'
  ];

  const PARAGRAPHS = {
    beginner: [
      'The sun is warm and the sky is blue. A small dog runs in the park. It likes to play with a red ball. The kids laugh and run too. It is a good day to be outside.',
      'I like to read a book at night. My room is quiet and my bed is soft. I turn the page and the story goes on. Soon my eyes feel heavy and I go to sleep.',
      'We went to the shop to get some food. We got milk, bread, eggs and fruit. Mom paid at the desk and we walked back home. It was a short and happy trip.',
      'A cat sat on the wall and looked at the birds. The birds sang in the tall tree. The cat did not move. Then a leaf fell and the cat ran away.',
      'My friend and I like to ride our bikes. We ride to the lake and back. The wind is cool on our face. We stop to drink some water and rest in the shade.'
    ],
    intermediate: [
      'Learning a new skill takes patience and regular practice. At first, progress may feel slow, but every session builds muscle memory. Over time, actions that once required effort become natural, and you begin to enjoy the process as much as the results.',
      'The city woke up slowly as the morning light spread across the rooftops. Shop owners opened their doors, buses filled with sleepy commuters, and the smell of fresh bread drifted from the corner bakery. Another busy day had quietly begun.',
      'Remote work has changed how many teams collaborate. Video calls, shared documents, and instant messaging allow people in different time zones to work together. However, clear communication and trust are still the most important ingredients of success.',
      'Mountains have always attracted adventurers. Climbers train for months, studying weather patterns and practicing with heavy packs. When they finally reach the summit, the breathtaking view makes every difficult step along the way worthwhile.',
      'A healthy breakfast gives your body the energy it needs to start the day. Whole grains, fresh fruit, and a source of protein keep you full for hours. Skipping breakfast often leads to poor concentration and unhealthy snacking later.'
    ],
    advanced: [
      'Quantum computing exploits the principles of superposition and entanglement to perform calculations that would take classical computers millennia. Although practical, error-corrected machines remain years away, researchers have already demonstrated algorithms that could revolutionize cryptography, logistics, and pharmaceutical discovery.',
      'The Renaissance, which flourished between the fourteenth and seventeenth centuries, represented an extraordinary revival of classical learning. Artists such as Leonardo and Michelangelo combined meticulous observation with imaginative brilliance, while scholars questioned long-held assumptions about science, philosophy, and governance.',
      'Effective software architecture balances competing concerns: scalability, maintainability, security, and performance. Experienced engineers recognize that premature optimization is counterproductive; instead, they establish clear boundaries, write comprehensive tests, and refactor incrementally as requirements evolve.',
      'Climate scientists emphasize that mitigating global warming requires simultaneous, coordinated action across industries. Transitioning to renewable energy, electrifying transportation, improving agricultural practices, and protecting biodiversity are interdependent strategies; neglecting any single area undermines the effectiveness of the others.',
      'Psychologists have long debated whether expertise is primarily innate or acquired. Contemporary research suggests that deliberate practice - focused, effortful, and accompanied by immediate feedback - explains a remarkable proportion of exceptional performance, although genetic predispositions undoubtedly influence how quickly individuals improve.'
    ]
  };

  const CODE = {
    java: [
`public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
`public int sum(int[] numbers) {
    int total = 0;
    for (int n : numbers) {
        total += n;
    }
    return total;
}`,
`@RestController
@RequestMapping("/api/users")
public class UserController {
    @GetMapping("/{id}")
    public User find(@PathVariable Long id) {
        return service.findById(id);
    }
}`,
`List<String> names = users.stream()
    .filter(u -> u.isActive())
    .map(User::getName)
    .sorted()
    .collect(Collectors.toList());`
    ],
    javascript: [
`function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet("Racer"));`,
`const scores = [42, 87, 65, 99];
const best = Math.max(...scores);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;`,
`async function loadUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}`,
`document.querySelector("#btn").addEventListener("click", () => {
  count++;
  label.textContent = count;
});`
    ],
    html: [
`<!DOCTYPE html>
<html lang="en">
<head>
  <title>My Page</title>
</head>
<body>
  <h1>Welcome</h1>
</body>
</html>`,
`<form action="/login" method="post">
  <label for="user">Username</label>
  <input id="user" type="text" required>
  <button type="submit">Login</button>
</form>`,
`<nav class="menu">
  <ul>
    <li><a href="#home">Home</a></li>
    <li><a href="#about">About</a></li>
  </ul>
</nav>`
    ],
    css: [
`.card {
  display: flex;
  padding: 16px;
  border-radius: 12px;
  background: #1e1b4b;
}`,
`body {
  margin: 0;
  font-family: Arial, sans-serif;
  color: #e2e8f0;
}
a:hover {
  color: cyan;
}`,
`@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}`
    ],
    python: [
`def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))`,
`numbers = [3, 1, 4, 1, 5, 9]
squares = [x * x for x in numbers if x > 2]
print(sorted(squares))`,
`class Car:
    def __init__(self, name, speed):
        self.name = name
        self.speed = speed

    def drive(self):
        return f"{self.name} at {self.speed} km/h"`,
`with open("scores.txt") as f:
    for line in f:
        name, score = line.split(",")
        print(name.strip(), int(score))`
    ]
  };

  /** Pool name -> array of tokens. MIXED combines several pools. */
  const POOLS = {
    EASY, MEDIUM, HARD, EXPERT, CAPITALS, PUNCTUATION, NUMBERS,
    MIXED: [].concat(MEDIUM, HARD.slice(0, 60), CAPITALS, PUNCTUATION, NUMBERS)
  };

  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];

  TM.Words = {
    POOLS, SENTENCES, PARAGRAPHS, CODE,
    pick,
    /** Random token from a pool, avoiding an immediate repeat. */
    word(pool = 'EASY', avoid) {
      const list = POOLS[pool] || EASY;
      let w;
      do { w = pick(list); } while (w === avoid && list.length > 1);
      return w;
    },
    /** n random words joined into one line. */
    words(n, pool = 'EASY') {
      const out = [];
      for (let i = 0; i < n; i++) out.push(this.word(pool, out[i - 1]));
      return out;
    },
    /** Pool name suited to a difficulty level (1, 2, 3, 4+). */
    poolForLevel(level) {
      return level <= 1 ? 'EASY' : level === 2 ? 'MEDIUM' : level === 3 ? 'HARD' : 'EXPERT';
    },
    /** Words of length between min and max from EASY+MEDIUM+HARD. */
    wordOfLength(min, max) {
      const all = POOLS.EASY.concat(POOLS.MEDIUM, POOLS.HARD);
      const fit = all.filter((w) => w.length >= min && w.length <= max);
      return pick(fit.length ? fit : all);
    },
    sentences(n) {
      const out = [];
      let last = '';
      for (let i = 0; i < n; i++) {
        let s;
        do { s = pick(SENTENCES); } while (s === last);
        out.push(s); last = s;
      }
      return out.join(' ');
    }
  };
})(window.TM);
