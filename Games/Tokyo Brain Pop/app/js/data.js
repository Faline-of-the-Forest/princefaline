// Tokyo Brain Pop — shared game data (students, demon tables, rules text)
// Extracted/adapted from the original single-player "Table Screen" tool.

export const STUDENTS = [
  {
    id: 'momo', label: 'HIROMI', pop: 'Average', tone: '#F6A7CA',
    quirkPool: ['"I have a secret boyfriend, and he is two years older."', '"I once beat the Demon Prince of Shinjuku in a duel!"', '"I can hold my breath for six whole minutes."', '"My father is a very famous man. I cannot say who."', '"I never lose at cards, and I never explain why."', '"I have a scar I tell four different stories about."', '"I have read every issue of every magazine in the library."', '"I know a shortcut through the school nobody else knows."', '"I can eat anything on a dare. Anything."', '"I keep a sword in my locker. For practice."'],
    goalPool: ['Start a demon-hunting club before the term ends.', 'Prove to Kotori that my boyfriend is real.', 'Get my name in the school paper — for something heroic.', 'Win a duel in front of a crowd.', 'Recruit one Student into my club, by any means.', 'Find proof that the old music room is haunted.', 'Beat the fastest time on the roof stair climb.', 'Get out of remedial class without studying.', 'Make a rival admit I was right about something.', 'Keep a promise I already regret making.'],
    bio: 'Second-year transfer, all confidence and no receipts. Tells tall tales about demon duels nobody witnessed, and carries a charm bag of salt she refuses to explain. New enough that she still thinks she can fix Atarashi.',
    psi: { short: 'BURN!', name: 'PSI BURN!', desc: 'Create a pocket of burning heat or spark a flame. Boil water, make metal glow, or cook the blood inside someone’s veins. Wild and hard to keep under control.' }
  },
  {
    id: 'midori', label: 'KOTORI', pop: 'Most', tone: '#9CB39A',
    quirkPool: ['"Everyone copies my hair ribbons, and I pretend not to notice."', '"I keep a diary of everybody’s worst secrets."', '"I have never once been late, and I never will be."', '"Teachers ask me what the class is thinking."', '"I can cry on command, convincingly."', '"I remember every name, every birthday, every slight."', '"My handwriting has won three prefectural prizes."', '"I always know who is about to be dumped."', '"I have a key to a room I should not have a key to."', '"I have never been photographed badly."'],
    goalPool: ['Be elected Class President — unanimously.', 'Keep my diary of everyone’s secrets out of the wrong hands.', 'Get a teacher to owe me a favour.', 'Have my ribbon copied by every girl in Class 2-A.', 'End a rumour about me before the bell.', 'Learn one secret about each Student.', 'Be photographed at the centre of the group.', 'Ruin someone’s reputation without touching it.', 'Get an assembly cancelled entirely.', 'Be told, out loud, that I am the best.'],
    bio: 'Third-year class idol and president of everything worth presiding over. Smiles like she means it, remembers every favour owed, and knows exactly what you did last summer — it’s written down.',
    psi: { short: 'CRUSH!', name: 'PSI CRUSH!', desc: 'A burst of invisible force that pushes straight down or straight out. Whatever’s in the way goes through the floor, through the wall, or apart.' }
  },
  {
    id: 'ao', label: 'UME', pop: 'Least', tone: '#A9BEDC',
    quirkPool: ['"I eat lunch on the roof so nobody has to sit with me."', '"There is something living in my locker and I feed it."', '"I hear the school talking when it is empty."', '"I have not spoken in class since the first term."', '"I draw everyone I meet, without asking."', '"Animals follow me home and I let them."', '"I know every hiding place in this building."', '"I can go a whole day without being noticed."', '"I collect things other people throw away."', '"I sleep with the light on. It matters."'],
    goalPool: ['Find one real friend who knows what I can do.', 'Figure out what’s really living in my locker.', 'Eat lunch with somebody, anybody, once.', 'Get through a whole day without using PSI.', 'Give something I made to a Student who’ll keep it.', 'Learn who left the note in my desk.', 'Be seen doing something brave.', 'Return the thing I took from the nurse’s office.', 'Get invited somewhere by name.', 'Say the thing I have never said out loud.'],
    bio: 'First-year loner who eats lunch on the roof and talks to something no one else can see. Kind to stray cats and stray monsters alike. Wants, more than anything, to be wanted.',
    psi: { short: 'BLEED!', name: 'PSI BLEED!', desc: 'Take hold of the blood inside a body, yours or someone else’s, and move it. You can slash blood like a blade, or even puppet a person by dragging them from the inside. Excruciatingly painful.' }
  },
  {
    id: 'murasaki', label: 'YUMI', pop: 'Least', tone: '#C8A8D8',
    quirkPool: ['"My mother thinks I am in the tea ceremony club."', '"I have never lost a fight, and I have had eleven."', '"I smoke behind the gym and I am never caught."', '"I have my sister’s jacket and I never take it off."', '"I can pick any lock in this school."', '"I do not run from anything. Ever."', '"I owe somebody dangerous a favour."', '"I know which teachers are afraid of me."', '"I have broken three noses and regret one."', '"I ride a motorcycle I am too young to ride."'],
    goalPool: ['Find out what happened to my sister at Atarashi High.', 'Win a twelfth fight — cleanly.', 'Keep my mother believing I’m in the tea ceremony club.', 'Get into the records room after hours.', 'Protect a Student who can’t protect herself.', 'Track down the person who lied to my family.', 'Break something that deserves it.', 'Teach somebody to throw one good punch.', 'Leave before anyone asks me a question.', 'Settle an old debt today.'],
    bio: 'Second-year, undefeated, allegedly a member of the tea ceremony club. Came to Atarashi chasing a ghost that wears her sister’s face. Fists first, questions later.',
    psi: { short: 'GROW!', name: 'PSI GROW!', desc: 'Force your own flesh to grow. Muscle bulges out in tumorous ropes and gives you immense strength. You can grow seemingly infinitely, and become a mass of muscle and skin. Once it starts to grow, it’s hard to put a stop to it.' }
  }
];

export const PSI_SHARED = [
  { short: 'STORM!', kind: 'SHARED', bg: '#A9BEDC', name: 'PSI STORM!', desc: 'Levitate in the air, slowly spinning as psychic lightning fills the space around you. Terrifying to anyone watching.' },
  { short: 'POP!', kind: 'SHARED', bg: '#9CB39A', name: 'BRAIN POP!', desc: 'Make someone’s head explode, bursting apart and spraying gore and bone fragments in all directions. Pretty gross.' }
];

export const POP_TARGETS = { Most: 3, Average: 4, Least: 5 };
export const POP_LABEL = { Most: 'MOST POPULAR', Average: 'AVERAGE', Least: 'LEAST POPULAR' };

export const DEMON_TABLES = {
  type: ['A new student', 'A teacher', 'A family member', 'A government agent', 'A mysterious group', 'An animal or beast', 'A shapeshifter', 'A ghost or spirit', 'The undead', 'A cryptid or urban legend', 'An evil plant', 'An experiment or machine', 'A thing from outer space', 'A cursed or haunted place', 'A hideous monster', 'An actual demon', 'A natural disaster', 'A legendary villain', 'A god or demi-god', 'Roll twice and combine'],
  power: ['Weapons (guns / swords)', 'Animal features (teeth / claws / tentacles)', 'A swarm / a mob', 'Poison / disease', 'Stalking / going unseen', 'Unnatural beauty / charm / influence', 'Draining blood / draining energy', 'Fire', 'A mutation / extra limbs', 'Multiplying / spreading', 'Enormous size', 'Weird science', 'Dark magic (spells / potions)', 'Possession', 'Telepathy / mind control', 'Memories / dreams', 'Immortality / invulnerability', 'Time loop / time travel', 'PSI', 'Roll twice and combine'],
  complication: ['It only appears at a certain time', 'It can only be defeated by one specific weakness', 'Its lair must be found to defeat it', 'It looks normal, except for one tell-tale feature', 'It has a secret ally / minion', 'It has a hostage', 'It is being used / controlled by someone else', 'It has already infiltrated the school under a false identity', 'It already has a group of followers', 'It answers to a powerful master / patron', 'A ritual or invention is needed to defeat it', 'A curse must be broken before it can be defeated', 'It is being hunted by something worse', 'A deal / promise must be made to defeat it', 'Hurting it hurts someone else', 'Defeating it will cause a disaster', 'It is found at the end of a long journey', 'The Students already defeated it, but it’s back in a new form', 'It shares a history with one of the Students', 'Roll twice and combine'],
  goal: ['To eat someone, or something', 'To find something it lost', 'To take revenge on someone', 'To steal something', 'To take a mate', 'To kill a specific person', 'To move in', 'To feed on fear', 'To summon something worse', 'To rise to power / take over', 'To spread misery and chaos', 'To protect someone / something', 'To repay a debt / keep a promise', 'To gather enough followers', 'To become immortal / young again', 'To be challenged', 'To capture a Student', 'To kill every psychic girl', 'To turn a Student to evil', 'Roll twice and combine']
};

export const RULES = [
  { label: 'The Setting', title: 'The Setting', blocks: [
    { t: 'p', text: 'Atarashi High School sits in the heart of Tokyo, where the supernatural is simply a fact of life. When demons, ghosts, and monsters attack, it falls to young women with psychic powers to fight back.' },
    { t: 'p', text: 'PSI is as much a curse as a gift. It manifests in strange, unsettling ways, so most psychic girls hide their powers — and many are driven to insanity before they learn to control them.' },
    { t: 'li', text: 'Atarashi is co-ed, but Students are always girls. It was built soon after the Second World War.' },
    { t: 'li', text: 'There is a Club for everyone — anything the players dream up can be a Club.' },
    { t: 'li', text: 'It is full of secrets. The longer you stay, the more mysteries surface: a Shinto temple beneath it, a wartime prison, girls vanishing for decades.' },
    { t: 'p', text: 'At least 562,321 forces work against the common Japanese schoolgirl. At least half seek the destruction of the psychic ones — from demons and ghosts to administrators, the military, and unnamable secret organizations.' }
  ] },
  { label: 'Scenes', title: 'Scenes', blocks: [
    { t: 'p', text: 'Players take turns being the Lead. Each Student gets only two Scenes as Lead per episode — though the episode can end sooner if the Demon is defeated early. If the Demon is undefeated at the last Scene, it succeeds at its goal.' },
    { t: 'p', text: 'At the start of a Scene, the Lead chooses her focus from her remaining Goals. She and the Headmaster work out the Scene together; other players may suggest, but the Lead and Headmaster decide what makes it in.' },
    { t: 'p', text: 'Any player may bring their Student into a Scene at any time, even mid-Scene.' },
    { t: 'p', text: 'A Scene should last 5–15 minutes, but the Headmaster decides when it ends. At the end, the Headmaster decides whether the Lead completed her Goal. Only one Goal can be completed per Scene, and only by the Lead.' }
  ] },
  { label: 'Students', title: 'Students', blocks: [
    { t: 'h', text: 'Quirks' },
    { t: 'p', text: 'A Quirk can be a trait, a special interest, a strange power, a relationship, a possession, or an embarrassing secret. Choose two at the start — never more. In a Challenge, if a Quirk is relevant, lower the number you need to roll by 1.' },
    { t: 'h', text: 'Goals' },
    { t: 'p', text: 'At the start of each episode, choose two Goals your Student wants to accomplish. The Demon is strengthened by every unresolved Goal, so choose ones you can actually finish.' },
    { t: 'h', text: 'Best Friend & Rival' },
    { t: 'p', text: 'Choose one Student as your Best Friend and a different one as your Rival. These bonds are not mutual — the girl you name as Best Friend may name you as her Rival.' },
    { t: 'p', text: 'Your Best Friend and Rival are the only Students you can Call a Challenge on.' }
  ] },
  { label: 'Challenges', title: 'Challenges', blocks: [
    { t: 'p', text: 'At any point in a Scene, a Student may Call a Challenge on her Rival or Best Friend, explaining how it complicates that Student’s attempt at the Scene’s focus. The Headmaster may veto an unjustified Challenge; if allowed, the caller immediately gains 1 Drama. A Student at 5 Drama (the max) cannot Call.' },
    { t: 'p', text: 'Rival: explains how the situation complicates the action — never involving the Demon. Best Friend: explains how today’s Demon works against the action.' },
    { t: 'h', text: 'Resolving a Challenge' },
    { t: 'p', text: 'The Challenged Student rolls a die. The number she needs depends on Popularity: Most Popular 3–6, Average 4–6, Least Popular 5–6. If a Quirk applies, lower the target by 1.' },
    { t: 'li', text: 'Success: the Student’s Best Friend narrates how she accomplishes it. If the Best Friend Called it, she gains 1 Drama.' },
    { t: 'li', text: 'Failure: the Rival narrates what goes wrong. If the Rival Called it, she gains 1 Drama. The Student always gains 1 Drama on a failure.' },
    { t: 'li', text: 'Use PSI: the Challenge succeeds automatically, no one gains Drama. The Rival narrates — working in as much awfulness as possible.' },
    { t: 'h', text: 'Death' },
    { t: 'p', text: 'Fighting monsters is dangerous, but psychic Students can’t die while the Demon is undefeated. A dead Student may return as a Ghost or Ghoul to keep playing.' }
  ] },
  { label: 'Drama & the Vote', title: 'Drama & the Class Vote', blocks: [
    { t: 'p', text: 'Each Student starts the game with 1 Drama. Drama is earned by Calling Challenges, never exceeds 5, and does not carry over — it resets to 1 at the start of every session.' },
    { t: 'h', text: 'Class Vote' },
    { t: 'p', text: 'Popularity decides how easily a Student succeeds, and Popularity is set by a Class Vote. Each player may call one Vote per session, after a Scene ends. The episode always opens with a Class Vote.' },
    { t: 'p', text: 'During a Vote, every player secretly spends Drama on Students — split it, dump it on one, spend it on yourself, or spend none. The Student with the most spent on her becomes Most Popular; the least becomes Least Popular. Ties are settled randomly.' }
  ] },
  { label: 'Breaking', title: 'Breaking', blocks: [
    { t: 'p', text: 'Breaking happens when a Student gains 1 Drama while already at Max — by failing a Challenge at max Drama, or gaining a second Drama after Calling.' },
    { t: 'p', text: 'Nothing happens immediately. The next time she is Called to a Challenge, her only option is "Break!": her PSI lashes out uncontrollably and catastrophically, and the Headmaster narrates the worst possible outcome.' },
    { t: 'p', text: 'After Breaking, her Drama resets to 0 and her Use PSI cost resets to 2.' }
  ] },
  { label: 'PSI', title: 'PSI', blocks: [
    { t: 'p', text: 'Nothing good ever came of psychic powers. They will destroy your Student’s life.' },
    { t: 'p', text: 'Facing a Challenge, a Student may Use PSI: her action succeeds automatically but always leads to awful consequences. PSI may be used any time, including after a Challenge is Called on her.' },
    { t: 'p', text: 'Using PSI costs 2 Drama. Each further use that episode costs 1 more, up to 5. The cost resets at the end of the episode. Every Student has one unique PSI ability of her own.' }
  ] },
  { label: 'The Demon', title: 'The Demon', blocks: [
    { t: 'p', text: 'The Demon is the main event — the big, nasty threat the Students face before the session ends. It can be an actual demon, a monster, or a mundane threat: a disaster, a secret organization, an evil teacher, ninjas, even alien invaders. The group creates it together at the start.' },
    { t: 'p', text: 'The Demon enters when a Student’s Best Friend Calls a Challenge on her and narrates how the Demon complicates the action. From then on the Headmaster narrates what the Demon does.' },
    { t: 'h', text: 'Challenging the Demon' },
    { t: 'p', text: 'A Student may Call a Challenge on the Demon (unless she holds 5 Drama), narrating how the situation works against it. She gains 1 Drama for Calling but never gains more from the result. The Demon rolls and succeeds on 4–6.' },
    { t: 'li', text: 'Its target lowers by 1 for every unresolved Student Goal, and raises by 1 for every Strike taken. It can never go below 2 or above 6 — the Demon always fails on a 1.' },
    { t: 'li', text: 'Every success marks the Bad End track; every failure marks the Good End track. Marks needed equals the number of Students playing.' },
    { t: 'p', text: 'There is only one Demon Challenge per Scene — it retreats after each one. If success becomes mathematically impossible, the Demon becomes the next Lead and does not retreat.' }
  ] }
];

export function rollDie() { return 1 + Math.floor(Math.random() * 6); }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function studentById(id) { return STUDENTS.find(s => s.id === id); }
