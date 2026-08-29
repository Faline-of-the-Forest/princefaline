
const BASE = {Most:3, Average:4, Least:5};
const LABEL = {Most:'MOST POPULAR', Average:'AVERAGE', Least:'LEAST POPULAR'};
const ORDER = ['Average', 'Most', 'Least'];
const DUR = 1200;
const PIP_MAP = {1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9]};
function pipsFor(n, dot) {
  const on = new Set(PIP_MAP[n]);
  return Array.from({length:9}, (_, i) => ({dot: on.has(i + 1) ? dot : 'transparent'}));
}
const SEATS = [
  {label:'HIROMI', who:'momo', pop:'Average', friend:1, rival:2,
   quirks:['“I have a secret boyfriend, and he is two years older.”', '“I once beat the Demon Prince of Shinjuku in a duel!”'],
   goal:'“I want to start a demon hunting club before the term ends.”',
   psi:{short:'BURN!', name:'PSI BURN!', desc:'Create a pocket of burning heat or spark a flame. Boil water, make metal glow, or cook the blood inside someone’s veins. Wild and hard to keep under control.'}},
  {label:'KOTORI', who:'midori', pop:'Most', friend:2, rival:3,
   quirks:['“Everyone copies my hair ribbons, and I pretend not to notice.”', '“I keep a diary of everybody’s worst secrets.”'],
   goal:'“I want to be elected Class President, unanimously.”',
   psi:{short:'CRUSH!', name:'PSI CRUSH!', desc:'A burst of invisible force that pushes straight down or straight out. Whatever’s in the way goes through the floor, through the wall, or apart.'}},
  {label:'UME', who:'ao', pop:'Least', friend:3, rival:0,
   quirks:['“I eat lunch on the roof so nobody has to sit with me.”', '“There is something living in my locker and I feed it.”'],
   goal:'“I want one real friend who knows what I can do.”',
   psi:{short:'BLEED!', name:'PSI BLEED!', desc:'Take hold of the blood inside a body, yours or someone else’s, and move it. You can slash blood like a blade, or even puppet a person by dragging them from the inside. Excruciatingly painful.'}},
  {label:'YUMI', who:'murasaki', pop:'Average', friend:0, rival:1,
   quirks:['“My mother thinks I am in the tea ceremony club.”', '“I have never lost a fight, and I have had eleven.”'],
   goal:'“I want to find out what happened to my sister at Atarashi High.”',
   psi:{short:'GROW!', name:'PSI GROW!', desc:'Force your own flesh to grow. Muscle bulges out in tumorous ropes and gives you immense strength. You can grow seemingly infinitely, and become a mass of muscle and skin. Once it starts to grow, it’s hard to put a stop to it.'}}
];
const PSI_SHARED = [
  {short:'STORM!', kind:'SHARED', bg:'#A9BEDC', name:'PSI STORM!', desc:'Levitate in the air, slowly spinning as psychic lightning fills the space around you. Terrifying to anyone watching.'},
  {short:'POP!', kind:'SHARED', bg:'#9CB39A', name:'BRAIN POP!', desc:'Make someone’s head explode, bursting apart and spraying gore and bone fragments in all directions. Pretty gross.'}
];

const BIOS = {
  momo: {goals:['Start a demon-hunting club before the term ends.', 'Prove to Kotori that my boyfriend is real.'], bio:'Second-year transfer, all confidence and no receipts. Tells tall tales about demon duels nobody witnessed, and carries a charm bag of salt she refuses to explain. New enough that she still thinks she can fix Atarashi.'},
  midori: {goals:['Be elected Class President — unanimously.', 'Keep my diary of everyone’s secrets out of the wrong hands.'], bio:'Third-year class idol and president of everything worth presiding over. Smiles like she means it, remembers every favour owed, and knows exactly what you did last summer — it’s written down.'},
  ao: {goals:['Find one real friend who knows what I can do.', 'Figure out what’s really living in my locker.'], bio:'First-year loner who eats lunch on the roof and talks to something no one else can see. Kind to stray cats and stray monsters alike. Wants, more than anything, to be wanted.'},
  murasaki: {goals:['Find out what happened to my sister at Atarashi.', 'Win my twelfth fight.'], bio:'Second-year, undefeated, allegedly a member of the tea ceremony club. Came to Atarashi chasing a ghost that wears her sister’s face. Fists first, questions later.'}
};

const RULES = [
  {label:'The Setting', title:'The Setting', blocks:[
    {t:'p', text:'Atarashi High School sits in the heart of Tokyo, where the supernatural is simply a fact of life. When demons, ghosts, and monsters attack, it falls to young women with psychic powers to fight back.'},
    {t:'p', text:'PSI is as much a curse as a gift. It manifests in strange, unsettling ways, so most psychic girls hide their powers — and many are driven to insanity before they learn to control them.'},
    {t:'li', text:'Atarashi is co-ed, but Students are always girls. It was built soon after the Second World War.'},
    {t:'li', text:'There is a Club for everyone — anything the players dream up can be a Club.'},
    {t:'li', text:'It is full of secrets. The longer you stay, the more mysteries surface: a Shinto temple beneath it, a wartime prison, girls vanishing for decades.'},
    {t:'p', text:'At least 562,321 forces work against the common Japanese schoolgirl. At least half seek the destruction of the psychic ones — from demons and ghosts to administrators, the military, and unnamable secret organizations.'}
  ]},
  {label:'Scenes', title:'Scenes', blocks:[
    {t:'p', text:'Players take turns being the Lead. Each Student gets only two Scenes as Lead per episode — though the episode can end sooner if the Demon is defeated early. If the Demon is undefeated at the last Scene, it succeeds at its goal.'},
    {t:'p', text:'At the start of a Scene, the Lead chooses her focus from her remaining Goals. She and the Headmaster work out the Scene together; other players may suggest, but the Lead and Headmaster decide what makes it in.'},
    {t:'p', text:'Any player may bring their Student into a Scene at any time, even mid-Scene.'},
    {t:'p', text:'A Scene should last 5–15 minutes, but the Headmaster decides when it ends. At the end, the Headmaster decides whether the Lead completed her Goal. Only one Goal can be completed per Scene, and only by the Lead.'}
  ]},
  {label:'Students', title:'Students', blocks:[
    {t:'h', text:'Quirks'},
    {t:'p', text:'A Quirk can be a trait, a special interest, a strange power, a relationship, a possession, or an embarrassing secret. Choose two at the start — never more. In a Challenge, if a Quirk is relevant, lower the number you need to roll by 1.'},
    {t:'h', text:'Goals'},
    {t:'p', text:'At the start of each episode, choose two Goals your Student wants to accomplish. The Demon is strengthened by every unresolved Goal, so choose ones you can actually finish.'},
    {t:'h', text:'Best Friend & Rival'},
    {t:'p', text:'Choose one Student as your Best Friend and a different one as your Rival. These bonds are not mutual — the girl you name as Best Friend may name you as her Rival.'},
    {t:'p', text:'Your Best Friend and Rival are the only Students you can Call a Challenge on.'}
  ]},
  {label:'Challenges', title:'Challenges', blocks:[
    {t:'p', text:'At any point in a Scene, a Student may Call a Challenge on her Rival or Best Friend, explaining how it complicates that Student’s attempt at the Scene’s focus. The Headmaster may veto an unjustified Challenge; if allowed, the caller immediately gains 1 Drama. A Student at 5 Drama (the max) cannot Call.'},
    {t:'p', text:'Rival: explains how the situation complicates the action — never involving the Demon. Best Friend: explains how today’s Demon works against the action.'},
    {t:'h', text:'Resolving a Challenge'},
    {t:'p', text:'The Challenged Student rolls a die. The number she needs depends on Popularity: Most Popular 3–6, Average 4–6, Least Popular 5–6. If a Quirk applies, lower the target by 1.'},
    {t:'li', text:'Success: the Student’s Best Friend narrates how she accomplishes it. If the Best Friend Called it, she gains 1 Drama.'},
    {t:'li', text:'Failure: the Rival narrates what goes wrong. If the Rival Called it, she gains 1 Drama. The Student always gains 1 Drama on a failure.'},
    {t:'li', text:'Use PSI: the Challenge succeeds automatically, no one gains Drama. The Rival narrates — working in as much awfulness as possible.'},
    {t:'h', text:'Death'},
    {t:'p', text:'Fighting monsters is dangerous, but psychic Students can’t die while the Demon is undefeated. A dead Student may return as a Ghost or Ghoul to keep playing.'}
  ]},
  {label:'Drama & the Vote', title:'Drama & the Class Vote', blocks:[
    {t:'p', text:'Each Student starts the game with 1 Drama. Drama is earned by Calling Challenges, never exceeds 5, and does not carry over — it resets to 1 at the start of every session.'},
    {t:'h', text:'Class Vote'},
    {t:'p', text:'Popularity decides how easily a Student succeeds, and Popularity is set by a Class Vote. Each player may call one Vote per session, after a Scene ends. The episode always opens with a Class Vote.'},
    {t:'p', text:'During a Vote, every player secretly spends Drama on Students — split it, dump it on one, spend it on yourself, or spend none. The Student with the most spent on her becomes Most Popular; the least becomes Least Popular. Ties are settled randomly.'}
  ]},
  {label:'Breaking', title:'Breaking', blocks:[
    {t:'p', text:'Breaking happens when a Student gains 1 Drama while already at Max — by failing a Challenge at max Drama, or gaining a second Drama after Calling.'},
    {t:'p', text:'Nothing happens immediately. The next time she is Called to a Challenge, her only option is “Break!”: her PSI lashes out uncontrollably and catastrophically, and the Headmaster narrates the worst possible outcome.'},
    {t:'p', text:'After Breaking, her Drama resets to 0 and her Use PSI cost resets to 2.'}
  ]},
  {label:'PSI', title:'PSI', blocks:[
    {t:'p', text:'Nothing good ever came of psychic powers. They will destroy your Student’s life.'},
    {t:'p', text:'Facing a Challenge, a Student may Use PSI: her action succeeds automatically but always leads to awful consequences. PSI may be used any time, including after a Challenge is Called on her.'},
    {t:'p', text:'Using PSI costs 2 Drama. Each further use that episode costs 1 more, up to 5. The cost resets at the end of the episode. Every Student has one unique PSI ability of her own.'}
  ]},
  {label:'The Demon', title:'The Demon', blocks:[
    {t:'p', text:'The Demon is the main event — the big, nasty threat the Students face before the session ends. It can be an actual demon, a monster, or a mundane threat: a disaster, a secret organization, an evil teacher, ninjas, even alien invaders. The group creates it together at the start.'},
    {t:'p', text:'The Demon enters when a Student’s Best Friend Calls a Challenge on her and narrates how the Demon complicates the action. From then on the Headmaster narrates what the Demon does.'},
    {t:'h', text:'Challenging the Demon'},
    {t:'p', text:'A Student may Call a Challenge on the Demon (unless she holds 5 Drama), narrating how the situation works against it. She gains 1 Drama for Calling but never gains more from the result. The Demon rolls and succeeds on 4–6.'},
    {t:'li', text:'Its target lowers by 1 for every unresolved Student Goal, and raises by 1 for every Strike taken. It can never go below 2 or above 6 — the Demon always fails on a 1.'},
    {t:'li', text:'Every success marks the Bad End track; every failure marks the Good End track. Marks needed equals the number of Students playing.'},
    {t:'p', text:'There is only one Demon Challenge per Scene — it retreats after each one. If success becomes mathematically impossible, the Demon becomes the next Lead and does not retreat.'}
  ]}
];

const REEL_ITEM = 32;
const DIM = 'grayscale(.7) opacity(.85) drop-shadow(0 2px 1px rgba(35,31,32,.45))';
const SEAT_TONE = {momo:'#F6A7CA', midori:'#9CB39A', ao:'#A9BEDC', murasaki:'#C8A8D8'};
const DEMON = {name:'GASHADOKURO', goal:'“Feed on the school’s despair before the term ends.”'};
const QUIRK_POOL = {
  momo: ['“I have a secret boyfriend, and he is two years older.”','“I once beat the Demon Prince of Shinjuku in a duel!”','“I can hold my breath for six whole minutes.”','“My father is a very famous man. I cannot say who.”','“I never lose at cards, and I never explain why.”','“I have a scar I tell four different stories about.”','“I have read every issue of every magazine in the library.”','“I know a shortcut through the school nobody else knows.”','“I can eat anything on a dare. Anything.”','“I keep a sword in my locker. For practice.”'],
  midori: ['“Everyone copies my hair ribbons, and I pretend not to notice.”','“I keep a diary of everybody’s worst secrets.”','“I have never once been late, and I never will be.”','“Teachers ask me what the class is thinking.”','“I can cry on command, convincingly.”','“I remember every name, every birthday, every slight.”','“My handwriting has won three prefectural prizes.”','“I always know who is about to be dumped.”','“I have a key to a room I should not have a key to.”','“I have never been photographed badly.”'],
  ao: ['“I eat lunch on the roof so nobody has to sit with me.”','“There is something living in my locker and I feed it.”','“I hear the school talking when it is empty.”','“I have not spoken in class since the first term.”','“I draw everyone I meet, without asking.”','“Animals follow me home and I let them.”','“I know every hiding place in this building.”','“I can go a whole day without being noticed.”','“I collect things other people throw away.”','“I sleep with the light on. It matters.”'],
  murasaki: ['“My mother thinks I am in the tea ceremony club.”','“I have never lost a fight, and I have had eleven.”','“I smoke behind the gym and I am never caught.”','“I have my sister’s jacket and I never take it off.”','“I can pick any lock in this school.”','“I do not run from anything. Ever.”','“I owe somebody dangerous a favour.”','“I know which teachers are afraid of me.”','“I have broken three noses and regret one.”','“I ride a motorcycle I am too young to ride.”']
};
const GOAL_POOL = {
  momo: ['Start a demon-hunting club before the term ends.','Prove to Kotori that my boyfriend is real.','Get my name in the school paper — for something heroic.','Win a duel in front of a crowd.','Recruit one Student into my club, by any means.','Find proof that the old music room is haunted.','Beat the fastest time on the roof stair climb.','Get out of remedial class without studying.','Make a rival admit I was right about something.','Keep a promise I already regret making.'],
  midori: ['Be elected Class President — unanimously.','Keep my diary of everyone\u2019s secrets out of the wrong hands.','Get a teacher to owe me a favour.','Have my ribbon copied by every girl in Class 2-A.','End a rumour about me before the bell.','Learn one secret about each Student.','Be photographed at the centre of the group.','Ruin someone\u2019s reputation without touching it.','Get an assembly cancelled entirely.','Be told, out loud, that I am the best.'],
  ao: ['Find one real friend who knows what I can do.','Figure out what\u2019s really living in my locker.','Eat lunch with somebody, anybody, once.','Get through a whole day without using PSI.','Give something I made to a Student who\u2019ll keep it.','Learn who left the note in my desk.','Be seen doing something brave.','Return the thing I took from the nurse\u2019s office.','Get invited somewhere by name.','Say the thing I have never said out loud.'],
  murasaki: ['Find out what happened to my sister at Atarashi High.','Win a twelfth fight — cleanly.','Keep my mother believing I\u2019m in the tea ceremony club.','Get into the records room after hours.','Protect a Student who can\u2019t protect herself.','Track down the person who lied to my family.','Break something that deserves it.','Teach somebody to throw one good punch.','Leave before anyone asks me a question.','Settle an old debt today.']
};
const DEMON_TABLES = {
  type: ['A new student','A teacher','A family member','A government agent','A mysterious group','An animal or beast','A shapeshifter','A ghost or spirit','The undead','A cryptid or urban legend','An evil plant','An experiment or machine','A thing from outer space','A cursed or haunted place','A hideous monster','An actual demon','A natural disaster','A legendary villain','A god or demi-god','Roll twice and combine'],
  power: ['Weapons (guns / swords)','Animal features (teeth / claws / tentacles)','A swarm / a mob','Poison / disease','Stalking / going unseen','Unnatural beauty / charm / influence','Draining blood / draining energy','Fire','A mutation / extra limbs','Multiplying / spreading','Enormous size','Weird science','Dark magic (spells / potions)','Possession','Telepathy / mind control','Memories / dreams','Immortality / invulnerability','Time loop / time travel','PSI','Roll twice and combine'],
  complication: ['It only appears at a certain time','It can only be defeated by one specific weakness','Its lair must be found to defeat it','It looks normal, except for one tell-tale feature','It has a secret ally / minion','It has a hostage','It is being used / controlled by someone else','It has already infiltrated the school under a false identity','It already has a group of followers','It answers to a powerful master / patron','A ritual or invention is needed to defeat it','A curse must be broken before it can be defeated','It is being hunted by something worse','A deal / promise must be made to defeat it','Hurting it hurts someone else','Defeating it will cause a disaster','It is found at the end of a long journey','The Students already defeated it, but it\u2019s back in a new form','It shares a history with one of the Students','Roll twice and combine'],
  goal: ['To eat someone, or something','To find something it lost','To take revenge on someone','To steal something','To take a mate','To kill a specific person','To move in','To feed on fear','To summon something worse','To rise to power / take over','To spread misery and chaos','To protect someone / something','To repay a debt / keep a promise','To gather enough followers','To become immortal / young again','To be challenged','To capture a Student','To kill every psychic girl','To turn a Student to evil','Roll twice and combine']
};

const EG_GIRLS = [
  { img: 'assets/portrait-momo.png', head: 'assets/head-momo.png', name: 'HIROMI', player: 'played by Sara' },
  { img: 'assets/portrait-ao.png', head: 'assets/head-ao.png', name: 'UME', player: 'played by Yuki' },
  { img: 'assets/portrait-midori.png', head: 'assets/head-midori.png', name: 'KOTORI', player: 'played by Dana' },
  { img: 'assets/portrait-murasaki.png', head: 'assets/head-murasaki.png', name: 'YUMI', player: 'played by Kim' }
];
const EG_HEAD = { Hiromi: 0, Ume: 1, Kotori: 2, Yumi: 3 };
const EG_A = {
  burnout:  { icon: 'uploads/img-033.png', name: 'BURNOUT', desc: 'Used the most PSI.' },
  meltdown: { icon: 'uploads/img-032.png', name: 'MELTDOWN', desc: 'Broke! the most.' },
  slayer:   { icon: 'uploads/img-044.png', name: 'DEMON SLAYER', desc: 'Challenged the Demon the most.' },
  explorer: { icon: 'uploads/img-080.png', name: 'EXPLORER', desc: 'Had a Scene in every location.' },
  honor:    { icon: 'uploads/img-082.png', name: 'HONOR ROLL', desc: 'Defeated the Demon in 5 Scenes or fewer.' },
  perfect:  { icon: 'uploads/img-083.png', name: 'PERFECT SCORE', desc: 'Defeated the Demon without it winning once.' },
  over:     { icon: 'uploads/img-084.png', name: 'OVERACHIEVER', desc: 'Completed every Goal.' },
  gossip:   { icon: 'uploads/img-085.png', name: 'HIGH SCORE', desc: 'Earned the most Drama.' },
  prez:     { icon: 'uploads/img-087.png', name: 'CLASS PRESIDENT', desc: 'Was Most Popular the most often.' },
  clumsy:   { icon: 'uploads/img-088.png', name: 'CLUMSY', desc: 'Failed the most Challenges.' },
  mark:     { icon: 'uploads/img-089.png', name: 'EASY MARK', desc: 'Was Challenged the most.' },
  influencer:{ icon: 'uploads/img-079.png', name: 'INFLUENCER', desc: 'Called the most Votes.' }
};
const EG_ENDS = {
  good: {
    kindLabel: 'GOOD END', title: 'DEMON DEFEATED!', accent: '#EDE31B', bg: '#F4EFA0',
    icon: 'assets/icon-goodend.png', dark: false,
    achievements: [
      { ...EG_A.honor, who: 'THE TABLE', table: true },
      { ...EG_A.perfect, who: 'THE TABLE', table: true },
      { ...EG_A.slayer, who: 'UME' },
      { ...EG_A.over, who: 'KOTORI' },
      { ...EG_A.prez, who: 'HIROMI' },
      { ...EG_A.gossip, who: 'YUMI' }
    ]
  },
  bad: {
    kindLabel: 'BAD END', title: 'THE DEMON WINS...', accent: '#E23A3A', bg: '#D9CFCB',
    icon: 'assets/icon-badend.png', dark: true,
    achievements: [
      { ...EG_A.meltdown, who: 'YUMI' },
      { ...EG_A.burnout, who: 'HIROMI' },
      { ...EG_A.clumsy, who: 'UME' },
      { ...EG_A.mark, who: 'KOTORI' },
      { ...EG_A.explorer, who: 'THE TABLE', table: true },
      { ...EG_A.influencer, who: 'KOTORI' }
    ]
  }
};
const LOCATIONS = [
  {name:'SCHOOL', img:'assets/place-school.jpg', subs:['Class 2-A', 'The Roof, After Bell', 'Old Music Room', 'Nurse’s Office']},
  {name:'CITY', img:'assets/place-city.jpg', subs:['Shinjuku, 11pm', 'Under the Overpass', 'Karaoke Booth 4']},
  {name:'SHOPPING STREET', img:'assets/place-mall.jpg', subs:['The Crepe Stand', 'Arcade, Back Row', 'Closing Time']},
  {name:'FOREST', img:'assets/place-forest.jpg', subs:['The Shrine Steps', 'Under the Torii', 'Off the Path']}
];
function faceOf(who) {
  return {oMomo: who === 'momo' ? 1 : 0, oMidori: who === 'midori' ? 1 : 0, oAo: who === 'ao' ? 1 : 0, oMurasaki: who === 'murasaki' ? 1 : 0};
}

class Component extends DCLogic {
  state = {endKind: null, setupOpen: true, setupStep: 'select', locks: [false,false,false,false], focusSeat: null, picking: null, pickStep: 'quirks', goalPicks: {}, quirkPicks: {}, playerNames: {}, speeds: {}, spinning: {type:false,power:false,complication:false,goal:false}, rolled: {type:[],power:[],complication:[],goal:[]}, demonNameDraft: '', demonGoalDraft: '', subText: null, leadOverride: null, led: null, goalsDone: [[false,false],[true,false],[false,false],[false,false]], gmDraft: null, gmOpen: false, demonRoll: null, demonLockLead: null, justCleared: null, rollMode: null, challenge: null, player: 0, vote: null, voteEnabled: true, debugVisible: true, goodEnd: 0, badEnd: 0, scenePos: 0, demonIn: false, locIdx: 0, subIdx: 0, focusIdx: 0, goalIdx: 0, ui: {rulebook:false, rbTab:0, diary:false, diaryPress:false, helpPress:false}, chars: SEATS.map(s => ({...s, detail:false, psychic:false, phase:'idle', face:'?', landing:false, reelY:0, reelSpeed:0, drama:0, psiCost:2, votedOnce:false}))};

  measureAnchors = () => {
    const g = this._goodEl, c = this._sceneEl;
    if (!g || !c) return;
    const gr = g.getBoundingClientRect(), cr = c.getBoundingClientRect();
    const gx = Math.round(gr.left + gr.width / 2), cx = Math.round(cr.left + cr.width / 2);
    if (gx !== this.state.goodX || cx !== this.state.sceneX) this.setState({goodX: gx, sceneX: cx});
  };

  componentDidMount() {
    this._anchorTimer = setInterval(this.measureAnchors, 400);
    window.addEventListener('resize', this.measureAnchors);
    requestAnimationFrame(this.measureAnchors);
    this._onResize = () => this.forceUpdate();
    window.addEventListener('resize', this._onResize);
    this.fit = () => {
      const hdr = document.querySelector('[data-tbp="hdr"]');
      const dbg = document.querySelector('[data-tbp="dbg"]');
      const headerH = hdr ? hdr.getBoundingClientRect().height : 96;
      const dbgH = dbg ? dbg.getBoundingClientRect().height + 16 : 0;
      const availW = window.innerWidth - 56;
      const availH = Math.max(240, window.innerHeight - 16 - 28 - headerH - dbgH - 32);
      const rowScale = Math.max(.34, Math.min(1, availW / 1676, (availH * .58) / 519));
      const stageH = Math.max(110, availH - 519 * rowScale);
      const fitTo = (w, h) => Math.max(.3, Math.min(1, (stageH - 8) / h, (availW - 24) / w));
      const next = {rowScale, locScale: fitTo(760, 320), voteScale: fitTo(1300, 300), resScale: fitTo(1080, 470)};
      const cur = this.state;
      const same = Object.keys(next).every(k => Math.abs((cur[k] == null ? -1 : cur[k]) - next[k]) < .003);
      if (!same) this.setState(next);
    };
    this.fitSoon = () => {
      if (this.fitRaf) return;
      this.fitRaf = requestAnimationFrame(() => { this.fitRaf = null; this.fit(); });
    };
    this.observe = () => {
      if (!window.ResizeObserver) return;
      if (!this.ro) this.ro = new ResizeObserver(() => this.fitSoon());
      ['[data-tbp="hdr"]', '[data-tbp="dbg"]'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el && !el.__tbpObserved) { el.__tbpObserved = true; this.ro.observe(el); }
      });
    };
    this.fit();
    window.addEventListener('resize', this.fit);
    this.observe();
    requestAnimationFrame(this.fit);
    setTimeout(this.fit, 500);
    setTimeout(this.fit, 1500);
  }

  componentDidUpdate() { this.observe(); }

  componentWillUnmount() { window.removeEventListener('resize', this.fit); if (this.ro) this.ro.disconnect(); }

  setEnd(side, k) {
    this.setState(s => {
      const cur = side === 'good' ? s.goodEnd : s.badEnd;
      const other = side === 'good' ? s.badEnd : s.goodEnd;
      let next = cur === k ? k - 1 : k;
      if (next > 3 && other > 3) next = 3;
      return side === 'good' ? {goodEnd: next} : {badEnd: next};
    });
  }

  jumpScene(i) {
    this.setState(s => {
      const order = [0,1,2,3,0,1,2,3];
      if (order[s.scenePos] === i) return {scenePos: (s.scenePos + 1) % 8};
      for (let j = s.scenePos; j < 8; j++) if (order[j] === i) return {scenePos: j};
      return {scenePos: order.indexOf(i)};
    });
  }

  toggleDebug() { this.setState(s => ({debugVisible: !s.debugVisible})); }

  liveScene() {
    const order = [0,1,2,3,0,1,2,3], sp = this.state.scenePos;
    const lc = LOCATIONS[this.state.locIdx % LOCATIONS.length];
    return {
      locIdx: this.state.locIdx % LOCATIONS.length,
      sub: this.state.subText == null ? lc.subs[this.state.subIdx % lc.subs.length] : this.state.subText,
      leadIdx: this.state.leadOverride == null ? order[sp] : this.state.leadOverride,
      focusIdx: this.state.focusIdx,
      goalIdx: this.state.goalIdx,
      led: this.state.led ? this.state.led.slice() : SEATS.map((s, k) => order.slice(0, sp + 1).filter(x => x === k).length),
      done: (this.state.goalsDone || [[false,false],[false,false],[false,false],[false,false]]).map(d => d.slice())
    };
  }

  gmDraftOrLive() {
    const d = this.state.gmDraft || this.liveScene();
    return {locIdx:d.locIdx, sub:d.sub, leadIdx:d.leadIdx, focusIdx:d.focusIdx, goalIdx:d.goalIdx, led:d.led.slice(), done:d.done.map(x => x.slice())};
  }

  gmSet(patch) { this.setState({gmDraft: Object.assign(this.gmDraftOrLive(), patch)}); }

  gmToggleDone(seat, k) {
    const d = this.gmDraftOrLive();
    d.done[seat][k] = !d.done[seat][k];
    if (d.done[seat][k] && seat === d.leadIdx && d.focusIdx === 0 && d.goalIdx === k) {
      if (d.done[seat][1 - k]) d.focusIdx = 1; else d.goalIdx = 1 - k;
    }
    this.setState({gmDraft: d});
  }

  buildGm(stop) {
    const ACC = '#EDE31B';
    const d = this.gmDraftOrLive(), live = this.liveScene();
    const lc = LOCATIONS[d.locIdx];
    const lead = SEATS[d.leadIdx];
    const dl = d.focusIdx === 2, vs = d.focusIdx === 1;

    const places = LOCATIONS.map((p, i) => {
      const on = i === d.locIdx;
      return {name:p.name, img:p.img, imgOpacity: on ? 1 : .45,
        border: on ? ACC : 'rgba(239,230,200,.16)', ink: on ? ACC : '#EFE6C8',
        pick: () => this.gmSet({locIdx:i, sub:''})};
    });
    const subChips = lc.subs.map(s => {
      const on = s === d.sub;
      return {text:s, ink: on ? '#231F20' : 'rgba(239,230,200,.7)',
        bg: on ? ACC : 'transparent', border: on ? ACC : 'rgba(239,230,200,.25)',
        pick: () => this.gmSet({sub:s})};
    });
    const leads = SEATS.map((s, i) => {
      const on = !dl && i === d.leadIdx;
      const cleared = d.done[i].filter(Boolean).length;
      return {name:s.label, img:'assets/head-' + s.who + '.png', tone:SEAT_TONE[s.who], pad:'0px',
        border: on ? ACC : 'rgba(239,230,200,.14)',
        bg: on ? 'rgba(237,227,27,.12)' : 'transparent',
        opacity: on ? 1 : .7,
        ink: on ? ACC : 'rgba(239,230,200,.75)',
        clearLabel: cleared ? '★ ' + cleared + '/2 DONE' : d.led[i] + '/2 SCENES',
        clearInk: cleared ? ACC : 'rgba(239,230,200,.35)',
        pick: () => this.gmSet({leadIdx:i, focusIdx:0, goalIdx: d.done[i][0] ? 1 : 0})};
    });
    leads.push({name:'DEMON', img:'assets/icon-demon.png', tone:'#B4322C', pad:'5px',
      border: dl ? '#E23A3A' : 'rgba(239,230,200,.14)',
      bg: dl ? 'rgba(226,58,58,.16)' : 'transparent',
      opacity: dl ? 1 : .7, ink: dl ? '#E23A3A' : 'rgba(239,230,200,.75)',
      clearLabel:'GM SCENE', clearInk: dl ? '#E23A3A' : 'rgba(239,230,200,.35)',
      pick: () => this.gmSet({focusIdx:2})});

    const stepper = {
      label: dl ? 'SCENES LED — PICK A STUDENT' : 'SCENES ' + lead.label + ' HAS LED',
      pips: [0,1].map(k => ({
        bg: !dl && k < d.led[d.leadIdx] ? '#E23A3A' : 'transparent',
        border: !dl && k < d.led[d.leadIdx] ? '#E23A3A' : 'rgba(239,230,200,.35)',
        click: () => { if (!dl) { const led = d.led.slice(); led[d.leadIdx] = k + 1; this.gmSet({led}); } }
      })),
      inc: () => { if (!dl) { const led = d.led.slice(); led[d.leadIdx] = Math.min(2, led[d.leadIdx] + 1); this.gmSet({led}); } },
      dec: () => { if (!dl) { const led = d.led.slice(); led[d.leadIdx] = Math.max(0, led[d.leadIdx] - 1); this.gmSet({led}); } }
    };

    let raw;
    if (dl) {
      raw = [{tag:'THE DEMON LEADS', text:DEMON.goal, on:true, red:true, pick: () => {}}];
    } else {
      raw = BIOS[lead.who].goals.map((g, k) => ({
        tag: d.done[d.leadIdx][k] ? 'GOAL ' + (k + 1) + ' · COMPLETED' : 'GOAL ' + (k + 1),
        text: g, done: d.done[d.leadIdx][k], hasDone: true,
        on: d.focusIdx === 0 && d.goalIdx === k,
        pick: () => this.gmSet({focusIdx:0, goalIdx:k}),
        toggleDone: () => this.gmToggleDone(d.leadIdx, k)
      }));
      raw.push({tag:'AGAINST THE DEMON', text:'“Defeat the ' + DEMON.name + '.”', red:true, on:vs, pick: () => this.gmSet({focusIdx:1})});
    }
    const focusOptions = raw.map(o => {
      const hue = o.red ? '#E23A3A' : ACC;
      return {tag:o.tag, text:o.text, hasDone: !!o.hasDone,
        cursor: o.done ? 'not-allowed' : 'pointer',
        opacity: o.done ? .45 : 1,
        strike: o.done ? 'line-through' : 'none',
        border: o.on ? hue : 'rgba(239,230,200,.14)',
        bg: o.on ? (o.red ? 'rgba(226,58,58,.14)' : 'rgba(237,227,27,.1)') : 'rgba(239,230,200,.03)',
        dotBorder: o.on ? hue : 'rgba(239,230,200,.4)',
        dotBg: o.on ? hue : 'transparent',
        tagInk: o.red ? '#E23A3A' : (o.on || o.done ? ACC : 'rgba(239,230,200,.5)'),
        textInk: o.on ? '#EFE6C8' : 'rgba(239,230,200,.8)',
        doneBorder: o.done ? ACC : 'rgba(239,230,200,.16)',
        doneBg: o.done ? ACC : 'transparent',
        doneInk: o.done ? '#231F20' : 'rgba(239,230,200,.4)',
        pick: o.done ? () => {} : o.pick,
        toggleDone: o.toggleDone || (() => {})};
    });

    const preview = {
      img: lc.img, name: lc.name,
      sub: d.sub || 'Somewhere in ' + lc.name.toLowerCase() + '…',
      head: dl ? 'assets/icon-demon.png' : 'assets/head-' + lead.who + '.png',
      headPad: dl ? '5px' : '0px',
      chipBg: dl ? '#B4322C' : SEAT_TONE[lead.who],
      kind: dl ? 'LEAD · THE DEMON' : (vs ? 'LEAD · ' + lead.label + ' · VS THE DEMON' : 'LEAD · ' + lead.label),
      kindInk: dl || vs ? '#E23A3A' : ACC,
      goal: dl ? DEMON.goal : (vs ? '“Defeat the ' + DEMON.name + '.”' : '“' + BIOS[lead.who].goals[d.goalIdx % 2] + '”')
    };

    const jc = this.state.justCleared;
    const cs = jc ? SEATS[jc.seat] : lead;
    const cue = jc
      ? {head:'assets/head-' + cs.who + '.png', tone:SEAT_TONE[cs.who], border:ACC, ink:ACC,
         title: cs.label + ' CLEARED A GOAL', text: BIOS[cs.who].goals[jc.goal], strike:'line-through', badgeOpacity:1}
      : {head:'assets/head-' + cs.who + '.png', tone:SEAT_TONE[cs.who], border:'rgba(239,230,200,.14)', ink:'rgba(239,230,200,.45)',
         title:'NO GOAL CLEARED YET', text:'A star lands on her seat and the Goal is struck out in her Diary.', strike:'none', badgeOpacity:.18};

    const pending = [];
    if (d.locIdx !== live.locIdx) pending.push({text:'PLACE → ' + lc.name, bg:ACC});
    if (d.sub !== live.sub) pending.push({text:'SUB-LOCATION EDITED', bg:ACC});
    if (d.leadIdx !== live.leadIdx) pending.push({text:'LEAD → ' + lead.label, bg:ACC});
    if (d.focusIdx !== live.focusIdx || d.goalIdx !== live.goalIdx) pending.push({text:'FOCUS CHANGED', bg:ACC});
    if (d.led.join() !== live.led.join()) pending.push({text:'SCENE COUNT EDITED', bg:'#A9BEDC'});
    d.done.forEach((gs, i) => gs.forEach((v, k) => {
      if (v !== live.done[i][k]) pending.push({text:(v ? '✓ ' : '↩ ') + SEATS[i].label + ' GOAL ' + (k + 1), bg:'#9CB39A'});
    }));
    const dirty = pending.length > 0;

    return {
      show: this.state.gmOpen, stop,
      open: () => this.setState({gmOpen: true}),
      close: () => this.setState({gmOpen: false, gmDraft: null}),
      fireGood: () => this.setState({endKind: 'good', gmOpen: false}),
      fireBad: () => this.setState({endKind: 'bad', gmOpen: false}),
      dotBg: dirty && this.state.gmOpen ? '#E23A3A' : '#9CB39A',
      places, subChips, leads, stepper, focusOptions, preview, cue, pending,
      sub: d.sub,
      setSub: (e) => this.gmSet({sub: e.target.value}),
      apply: {
        click: () => { if (dirty) this.gmApply(); },
        cursor: dirty ? 'pointer' : 'default',
        bg: dirty ? ACC : 'rgba(239,230,200,.12)',
        ink: dirty ? '#231F20' : 'rgba(239,230,200,.35)',
        anim: dirty ? 'tbp-ready 1.5s ease-in-out infinite' : 'none',
        label: dirty ? 'APPLY' : 'APPLIED',
        note: dirty ? pending.length + ' change' + (pending.length > 1 ? 's' : '') + ' waiting — the table still sees the old scene.'
                    : 'The table is in sync with this panel.'
      }
    };
  }

  gmApply() {
    const d = this.gmDraftOrLive(), live = this.liveScene();
    let cleared = this.state.justCleared;
    d.done.forEach((gs, i) => gs.forEach((v, k) => { if (v && !live.done[i][k]) cleared = {seat:i, goal:k}; }));
    let shouted = null;
    d.done.forEach((gs, i) => gs.forEach((v, k) => { if (v && !live.done[i][k]) shouted = i; }));
    this.setState({locIdx:d.locIdx, subText:d.sub, leadOverride:d.leadIdx, focusIdx:d.focusIdx,
      goalIdx:d.goalIdx, led:d.led, goalsDone:d.done, justCleared:cleared, gmDraft:null,
      gmOpen: shouted != null ? false : this.state.gmOpen, shoutSeat: shouted});
    if (shouted != null) {
      clearTimeout(this._shoutT);
      this._shoutT = setTimeout(() => this.setState({shoutSeat: null}), 2700);
    }
  }

  setUi(obj) { this.setState(s => ({ui: Object.assign({}, s.ui, obj)})); }

  bumpDrama(i) {
    const c = this.state.chars[i];
    const cur = Number(c.drama) || 0;
    if (cur >= 5) this.patch(i, {drama: 0, broken: true});
    else this.patch(i, {drama: cur + 1});
  }

  addDrama(i, n) {
    const cur = Number(this.state.chars[i].drama) || 0;
    const willBreak = cur >= 5;
    this.patch(i, willBreak ? {drama: 0, broken: true, dramaPop: true} : {drama: Math.min(5, cur + n), dramaPop: true});
    clearTimeout(this.timers[i + 'd']);
    this.timers[i + 'd'] = setTimeout(() => this.patch(i, {dramaPop: false}), 800);
  }

  breakOut(i) {
    if (this.state.rollMode !== i) return;
    clearInterval(this.timers[i + 'i']); clearTimeout(this.timers[i + 't']); clearTimeout(this.timers[i + 'l']);
    this.patch(i, {phase: 'result', breakResult: true, broken: false, psychic: false});
    const ch = this.state.challenge;
    if (ch) this.setState({challenge: Object.assign({}, ch, {resolved: true})});
  }

  callChallenge(i) {
    if (this.state.vote) return;
    const ch = this.state.challenge;
    if (ch && !ch.resolved) return;
    const active = this.state.rollMode;
    if (active !== null) {
      const ap = this.state.chars[active].phase;
      if (ap !== 'result' && ap !== 'psychic') return;
      this.reset(active, {});
    }
    this.setState({rollMode: null, challenge: {by: i, phase: 'pick', resolved: false}});
  }

  startVote(caller) {
    if (this.state.vote || !this.state.voteEnabled) return;
    const ch = this.state.challenge;
    if (ch && !ch.resolved) return;
    if (this.state.chars[caller] && this.state.chars[caller].votedOnce) return;
    const active = this.state.rollMode;
    if (active !== null) { const ap = this.state.chars[active].phase; if (ap !== 'result' && ap !== 'psychic') { return; } this.reset(active, {}); }
    if (typeof caller === 'number') this.patch(caller, {votedOnce: true});
    const player = this.state.player;
    const alloc = this.state.chars.map((c, vi) => {
      const m = {};
      if (vi !== player) {
        let pts = Number(c.drama) || 0;
        while (pts-- > 0) { const t = Math.floor(Math.random() * 4); m[t] = (m[t] || 0) + 1; }
      }
      return m;
    });
    this.setState({rollMode: null, challenge: null, vote: {phase: 'assign', alloc, tick: [0,0,0,0], totals: null, most: null, least: null, tieMost: false, tieLeast: false, clock: 60}});
    this.startVoteClock();
  }

  startVoteClock() {
    clearInterval(this.timers.voteClock);
    this.timers.voteClock = setInterval(() => {
      const v = this.state.vote;
      if (!v || v.phase !== 'assign') { clearInterval(this.timers.voteClock); return; }
      const next = Math.max(0, (v.clock == null ? 60 : v.clock) - 1);
      this.setState({vote: Object.assign({}, v, {clock: next})});
      if (next === 0) { clearInterval(this.timers.voteClock); this.finishVote(); }
    }, 1000);
  }

  voteAdjust(target, delta) {
    const v = this.state.vote;
    if (!v || v.phase !== 'assign') return;
    const player = this.state.player;
    const alloc = v.alloc.map(m => Object.assign({}, m));
    const cur = alloc[player][target] || 0;
    const spent = Object.values(alloc[player]).reduce((a, b) => a + b, 0);
    const cap = Number(this.state.chars[player].drama) || 0;
    let next = cur + delta;
    if (next < 0) next = 0;
    if (delta > 0 && spent >= cap) return;
    alloc[player][target] = next;
    this.setState({vote: Object.assign({}, v, {alloc})});
  }

  finishVote() {
    const v = this.state.vote;
    if (!v || v.phase !== 'assign') return;
    clearInterval(this.timers.voteClock);
    const totals = [0,0,0,0];
    v.alloc.forEach(m => { for (const t in m) totals[+t] += m[t]; });
    const maxV = Math.max(...totals), minV = Math.min(...totals);
    const maxIdx = totals.map((n, k) => n === maxV ? k : -1).filter(k => k >= 0);
    const minIdx = totals.map((n, k) => n === minV ? k : -1).filter(k => k >= 0);
    const tieMost = maxIdx.length > 1;
    const tieLeast = minIdx.filter(k => !(maxIdx.length === 1 && k === maxIdx[0])).length > 1;
    this.setState({vote: Object.assign({}, v, {phase: 'count', totals, most: null, least: null, tieMost, tieLeast, rolls: {}, rollPool: [], tick: [0,0,0,0]})});
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1000);
      const e = 1 - Math.pow(1 - p, 3);
      const tick = totals.map(n => Math.round(n * e));
      const vv = this.state.vote;
      if (!vv) return;
      this.setState({vote: Object.assign({}, vv, {tick})});
      if (p < 1) this.rafs.vote = requestAnimationFrame(step);
      else this.startTieBreak(maxIdx, minIdx);
    };
    this.rafs.vote = requestAnimationFrame(step);
  }

  startTieBreak(maxIdx, minIdx) {
    const sameSet = maxIdx.length > 1 && maxIdx.length === minIdx.length && maxIdx.every(k => minIdx.indexOf(k) >= 0);
    if (sameSet) {
      const attempt = () => {
        this.rollRound(maxIdx, 'both', (rolls) => {
          const vals = maxIdx.map(k => rolls[k]);
          const hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals);
          const highs = maxIdx.filter(k => rolls[k] === hi);
          const lows = maxIdx.filter(k => rolls[k] === lo);
          if (highs.length > 1 || lows.length > 1) { attempt(); return; }
          this.applyVote(highs[0], lows[0]);
        });
      };
      attempt();
      return;
    }
    const finishMost = (most) => {
      let pool = minIdx.filter(k => k !== most);
      if (!pool.length) { this.applyVote(most, null); return; }
      if (pool.length > 1) this.pickEnd(pool, 'low', (least) => this.applyVote(most, least));
      else this.applyVote(most, pool[0]);
    };
    if (maxIdx.length > 1) this.pickEnd(maxIdx, 'high', finishMost);
    else finishMost(maxIdx[0]);
  }

  pickEnd(pool, mode, done) {
    this.rollRound(pool, mode, (rolls) => {
      const vals = pool.map(k => rolls[k]);
      const target = mode === 'high' ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
      const winners = pool.filter(k => rolls[k] === target);
      if (winners.length > 1) this.pickEnd(winners, mode, done);
      else done(winners[0]);
    });
  }

  rollRound(pool, mode, done) {
    const v = this.state.vote;
    if (!v) return;
    this.setState({vote: Object.assign({}, v, {phase: 'tiebreak', rollMode: mode, rollPool: pool.slice(), rollSpin: true})});
    const spin = setInterval(() => {
      const vv = this.state.vote;
      if (!vv) { clearInterval(spin); return; }
      const rolls = Object.assign({}, vv.rolls);
      pool.forEach(k => { rolls[k] = 1 + Math.floor(Math.random() * 6); });
      this.setState({vote: Object.assign({}, vv, {rolls})});
    }, 80);
    this.timers.tieSpin = spin;
    this.timers.tieEnd = setTimeout(() => {
      clearInterval(spin);
      const vv = this.state.vote;
      if (!vv) return;
      const rolls = Object.assign({}, vv.rolls);
      pool.forEach(k => { rolls[k] = 1 + Math.floor(Math.random() * 6); });
      this.setState({vote: Object.assign({}, vv, {rolls, rollSpin: false})});
      this.timers.tieNext = setTimeout(() => done(rolls), 800);
    }, 950);
  }

  applyVote(most, least) {
    const v = this.state.vote;
    if (!v) return;
    this.setState({vote: Object.assign({}, v, {most, least})});
    this.setState(s => {
      const chars = s.chars.slice();
      for (let k = 0; k < 4; k++) {
        const pop = k === most ? 'Most' : (k === least ? 'Least' : 'Average');
        const spent = Object.values(v.alloc[k]).reduce((a, b) => a + b, 0);
        chars[k] = Object.assign({}, chars[k], {pop, drama: Math.max(0, (Number(chars[k].drama) || 0) - spent), landing: spent > 0});
      }
      return {chars};
    });
    for (let k = 0; k < 4; k++) {
      clearTimeout(this.timers[k + 'l']);
      this.timers[k + 'l'] = setTimeout(() => this.patch(k, {landing: false}), 460);
    }
    const vv = this.state.vote;
    if (vv) this.setState({vote: Object.assign({}, vv, {most, least, phase: 'done'})});
  }

  closeVote() {
    clearTimeout(this.timers.voteend); clearTimeout(this.timers.tieEnd); clearTimeout(this.timers.tieNext);
    clearInterval(this.timers.tieSpin); clearInterval(this.timers.voteClock); cancelAnimationFrame(this.rafs.vote);
    this.setState({vote: null});
  }
  toggleVoteEnabled() {
    const on = !this.state.voteEnabled;
    this.setState(s => ({voteEnabled: on, chars: s.chars.map(c => Object.assign({}, c, {votedOnce: on ? false : c.votedOnce}))}));
  }

  setPsiCost(i, cost) { this.patch(i, {psiCost: Math.max(2, Math.min(5, cost))}); }
  setPlayer(idx) { this.setState({player: idx}); }

  rollFresh(cat) {
    const list = DEMON_TABLES[cat];
    const combine = list[list.length - 1];
    const rollOne = () => list[Math.floor(Math.random() * list.length)];
    const rollReal = () => { let r; do { r = rollOne(); } while (r === combine); return r; };
    const first = rollOne();
    return first === combine ? [first, rollReal(), rollReal()] : [first];
  }
  settleCategory(cat) {
    const slots = this.rollFresh(cat);
    this.setState(s => ({rolled: Object.assign({}, s.rolled, {[cat]: slots}), spinning: Object.assign({}, s.spinning, {[cat]: false})}));
  }
  spinThenSettle(cat, delay) {
    const d = delay || 0;
    setTimeout(() => this.setState(s => ({spinning: Object.assign({}, s.spinning, {[cat]: true}), speeds: Object.assign({}, s.speeds, {[cat]: '.16s'})})), d);
    setTimeout(() => this.setState(s => ({speeds: Object.assign({}, s.speeds, {[cat]: '.3s'})})), d + 1500);
    setTimeout(() => this.setState(s => ({speeds: Object.assign({}, s.speeds, {[cat]: '.62s'})})), d + 2400);
    setTimeout(() => this.setState(s => ({speeds: Object.assign({}, s.speeds, {[cat]: '1.15s'})})), d + 3100);
    setTimeout(() => this.settleCategory(cat), d + 3900);
  }
  rerollCategory(cat) { this.spinThenSettle(cat, 0); }
  rerollSlot(cat, idx) {
    const slots = this.state.rolled[cat] || [];
    if (slots.length <= 1) { this.rerollCategory(cat); return; }
    const list = DEMON_TABLES[cat];
    const combine = list[list.length - 1];
    let val; do { val = list[Math.floor(Math.random() * list.length)]; } while (val === combine);
    const next = slots.slice(); next[idx] = val;
    this.setState(s => ({rolled: Object.assign({}, s.rolled, {[cat]: next})}));
  }
  startRoll() {
    this.setState({rolled: {type:[],power:[],complication:[],goal:[]}});
    ['type','power','complication','goal'].forEach((cat, i) => this.spinThenSettle(cat, i * 420));
  }
  openGoalPicker(k) { this.setState({picking: k, pickStep: 'quirks', focusSeat: k}); }
  togglePick(k, gi) {
    const field = this.state.pickStep === 'quirks' ? 'quirkPicks' : 'goalPicks';
    const picks = Object.assign({}, this.state[field] || {});
    const cur = (picks[k] || []).slice();
    const at = cur.indexOf(gi);
    if (at >= 0) cur.splice(at, 1);
    else if (cur.length < 2) cur.push(gi);
    picks[k] = cur;
    this.setState({[field]: picks});
  }
  advancePicker(k) {
    if (this.state.pickStep === 'quirks') {
      const qp = (this.state.quirkPicks || {})[k] || [];
      if (qp.length !== 2) return;
      const who = SEATS[k].who;
      SEATS[k].quirks = qp.map(i => QUIRK_POOL[who][i]);
      const chars = this.state.chars.map((c, i) => i === k ? Object.assign({}, c, {quirks: SEATS[k].quirks}) : c);
      this.setState({pickStep: 'goals', chars});
      return;
    }
    this.confirmGoals(k);
  }
  confirmGoals(k) {
    const picks = (this.state.goalPicks || {})[k] || [];
    if (picks.length !== 2) return;
    const who = SEATS[k].who;
    const pool = GOAL_POOL[who];
    BIOS[who].goals = picks.map(gi => pool[gi]);
    SEATS[k].goal = '\u201c' + pool[picks[0]] + '\u201d';
    const locks = (this.state.locks || [false,false,false,false]).slice();
    const wasAll = locks.every(Boolean);
    locks[k] = true;
    this.setState({locks, picking: null}, () => {
      if (locks.every(Boolean) && !wasAll) this.startRoll();
    });
  }
  openSetup() { this.setState({setupOpen: true, setupStep: 'select', locks: [false,false,false,false], picking: null, goalPicks: {}, rolled: {type:[],power:[],complication:[],goal:[]}, spinning: {type:false,power:false,complication:false,goal:false}}); }
  closeSetup() { this.setState({setupOpen: false}); }
  continueToRoll() { this.setState({setupStep: 'roll'}); this.startRoll(); }
  launchGame() {
    const cats = ['type','power','complication','goal'];
    const ready = cats.every(c => !this.state.spinning[c] && (this.state.rolled[c] || []).length > 0);
    if (!ready || !this.state.demonNameDraft.trim() || !this.state.demonGoalDraft.trim()) return;
    DEMON.name = this.state.demonNameDraft.trim().toUpperCase();
    DEMON.goal = '\u201c' + this.state.demonGoalDraft.trim() + '\u201d';
    this.setState({setupOpen: false});
  }

  cancelChallenge() {
    if (this.state.challenge && this.state.challenge.phase === 'pick') this.setState({challenge: null});
  }

  selectTarget(target) {
    const ch = this.state.challenge;
    if (!ch || ch.phase !== 'pick') return;
    const by = ch.by;
    if (target === 'demon') {
      if (!this.demonPresent()) return;
      this.reset(by, {quirk: null, psychic: false});
      this.addDrama(by, 1);
      this.setState({rollMode: null, challenge: {by, rel: 'demon', phase: 'active', resolved: false},
        demonRoll: {by, phase: 'ready', face: null, success: null}});
      return;
      this.addDrama(by, 1);
      return;
    }
    const rel = target === SEATS[by].friend ? 'friend' : (target === SEATS[by].rival ? 'rival' : null);
    if (!rel) return;
    this.reset(target, {quirk: null, psychic: false});
    this.setState({rollMode: target, challenge: {by, rel, phase: 'active', resolved: false}});
    if (rel === 'friend' && this.state.demonLockLead !== this.curLead()) this.setState({demonIn: true});
    this.addDrama(by, 1);
  }

  curLead() {
    const order = [0,1,2,3,0,1,2,3];
    return this.state.leadOverride == null ? order[this.state.scenePos] : this.state.leadOverride;
  }

  demonLead() { return this.state.focusIdx === 2; }

  demonPresent() { return this.state.demonIn || this.demonLead(); }

  demonTarget() {
    const dr = this.state.demonRoll;
    const done = this.state.goalsDone;
    const unresolved = this.demonLead()
      ? done.reduce((a, g) => a + g.filter(v => !v).length, 0)
      : (dr ? done[dr.by].filter(v => !v).length : 0);
    return {unresolved, target: Math.max(2, Math.min(6, 4 - unresolved + this.state.goodEnd))};
  }

  rollDemon() {
    const dr = this.state.demonRoll;
    if (!dr || dr.phase !== 'ready') return;
    const target = this.demonTarget().target;
    const landed = 1 + Math.floor(Math.random() * 6);
    const ITEM = 96;
    const dist = (30 + landed - 1) * ITEM;
    this.setState({demonRoll: Object.assign({}, dr, {phase: 'rolling', reelY: 0, reelSpeed: 1})});
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1500);
      const e = 1 - Math.pow(1 - p, 4);
      if (p < 1) {
        this.setState(st => st.demonRoll ? {demonRoll: Object.assign({}, st.demonRoll, {reelY: dist * e, reelSpeed: 1 - p})} : {});
        this.rafs.dr = requestAnimationFrame(step);
        return;
      }
      const success = landed === 6 ? true : (landed === 1 ? false : landed >= target);
      this.setState(st => {
        const lead = st.focusIdx === 2;
        const out = {
          demonRoll: Object.assign({}, st.demonRoll, {phase: 'done', face: landed, success, reelY: dist, reelSpeed: 0}),
          challenge: st.challenge ? Object.assign({}, st.challenge, {resolved: true}) : null,
          rollMode: null
        };
        if (success) out.badEnd = Math.min(4, st.badEnd + 1); else out.goodEnd = Math.min(4, st.goodEnd + 1);
        if (out.badEnd > 3 && st.goodEnd > 3) out.goodEnd = 3;
        if (out.goodEnd > 3 && st.badEnd > 3) out.badEnd = 3;
        if (!lead) {
          out.demonIn = false;
          out.demonLockLead = st.leadOverride == null ? [0,1,2,3,0,1,2,3][st.scenePos] : st.leadOverride;
        }
        return out;
      });
    };
    this.rafs.dr = requestAnimationFrame(step);
  }

  toggleDemon() { this.setState(s => ({demonIn: !s.demonIn, demonLockLead: s.demonIn ? s.demonLockLead : null})); }

  resolveChallenge(target, success) {
    const ch = this.state.challenge;
    if (!ch || ch.phase !== 'active' || ch.resolved) return;
    if ((ch.rel === 'friend' && success) || (ch.rel === 'rival' && !success)) this.addDrama(ch.by, 1);
    this.setState({challenge: Object.assign({}, ch, {resolved: true})});
  }

  timers = {};
  rafs = {};

  patch(i, obj) {
    this.setState(s => {
      const chars = s.chars.slice();
      chars[i] = Object.assign({}, chars[i], obj);
      return {chars};
    });
  }

  usePsi(i, k) {
    const c = this.state.chars[i];
    const cost = Number(c.psiCost) || 2;
    if ((Number(c.drama) || 0) < cost) return;
    const name = k === 2 ? c.psi.name : PSI_SHARED[k].name;
    clearInterval(this.timers[i + 'i']); clearTimeout(this.timers[i + 't']); clearTimeout(this.timers[i + 'l']);
    cancelAnimationFrame(this.rafs[i]);
    this.patch(i, {phase:'psychic', psiUsed:name, psychic:false, psiHover:null, face:'?', landing:true, drama:(Number(c.drama)||0) - cost, psiCost: Math.min(5, cost + 1)});
    const ch = this.state.challenge;
    if (ch && ch.phase === 'active' && !ch.resolved) this.setState({challenge: Object.assign({}, ch, {resolved: true})});
    this.timers[i + 'l'] = setTimeout(() => this.patch(i, {landing:false}), 460);
  }

  roll(i) {
    const c = this.state.chars[i];
    if (this.state.rollMode !== i) return;
    if (c.phase === 'rolling' || c.phase === 'result' || c.phase === 'psychic') return;
    if (c.psychic) return;
    clearInterval(this.timers[i + 'i']); clearTimeout(this.timers[i + 't']); clearTimeout(this.timers[i + 'l']);
    cancelAnimationFrame(this.rafs[i]);
    this.patch(i, {phase:'rolling', landing:false, reelY:0, reelSpeed:1});
    const landed = 1 + Math.floor(Math.random() * 6);
    const target = (30 + landed - 1) * REEL_ITEM;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 4);
      if (p < 1) {
        this.patch(i, {reelY: target * e, reelSpeed: 1 - p});
        this.rafs[i] = requestAnimationFrame(step);
      } else {
        this.patch(i, {reelY: target, reelSpeed: 0, face: landed, phase:'result', landing:true});
        const tt = Math.max(2, BASE[c.pop] - (c.quirk === 0 || c.quirk === 1 ? 1 : 0));
        this.resolveChallenge(i, landed >= tt);
        this.timers[i + 'l'] = setTimeout(() => this.patch(i, {landing:false}), 460);
      }
    };
    this.rafs[i] = requestAnimationFrame(step);
  }

  reset(i, obj) {
    clearInterval(this.timers[i + 'i']); clearTimeout(this.timers[i + 't']); clearTimeout(this.timers[i + 'l']);
    cancelAnimationFrame(this.rafs[i]);
    this.patch(i, Object.assign({phase:'idle', face:'?', landing:false, reelY:0, reelSpeed:0}, obj));
  }

  componentWillUnmount() {
    Object.values(this.rafs).forEach(r => cancelAnimationFrame(r));
    Object.values(this.timers).forEach(t => { clearInterval(t); clearTimeout(t); });
  }

  renderVals() {
    const active = this.state.rollMode;
    const ch = this.state.challenge;
    const vote = this.state.vote;
    const player = this.state.player;
    const rollerBusy = active !== null && !(this.state.chars[active].phase === 'result' || this.state.chars[active].phase === 'psychic');
    const pickPhase = !!ch && ch.phase === 'pick';
    const voteActive = !!vote;
    const busy = pickPhase || rollerBusy || voteActive;
    const playerSpent = vote ? Object.values(vote.alloc[player]).reduce((a, b) => a + b, 0) : 0;
    const playerCap = Number(this.state.chars[player].drama) || 0;
    const cards = this.state.chars.map((c, i) => {
      const rollMode = active === i;
      const shout = this.state.shoutSeat === i;
      const isTarget = pickPhase && (i === SEATS[ch.by].friend || i === SEATS[ch.by].rival);
      const dvNow = Number(c.drama) || 0;
      const canCall = (!ch || ch.resolved) && !voteActive && !rollerBusy && dvNow < 5;
      const canVote = (!ch || ch.resolved) && !voteActive && !rollerBusy && this.state.voteEnabled && !c.votedOnce;
      const counting = voteActive && (vote.phase === 'count' || vote.phase === 'tiebreak' || vote.phase === 'done');
      const quirkSel = rollMode ? (c.quirk === 0 || c.quirk === 1 ? c.quirk : null) : null;
      const t = Math.max(2, BASE[c.pop] - (quirkSel === 0 || quirkSel === 1 ? 1 : 0));
      const rolling = c.phase === 'rolling';
      const psi = c.phase === 'psychic';
      const rolled = c.phase === 'result';
      const needsBreak = !!c.broken && rollMode && !rolled;
      const success = rolled && c.face >= t;
      const failure = rolled && !success;
      const showResult = rolled || psi;
      const dv = Number(c.drama) || 0;
      const max = dv >= 5;
      return {
        pMomo: c.who === 'momo' ? 1 : 0,
        pMidori: c.who === 'midori' ? 1 : 0,
        pAo: c.who === 'ao' ? 1 : 0,
        pMurasaki: c.who === 'murasaki' ? 1 : 0,
        portraitFilter: (counting && vote.most === i) ? 'saturate(1.35) contrast(1.05)' : ((counting && vote.least === i) ? 'grayscale(.55) brightness(.66) contrast(1.15)' : (psi ? 'saturate(1.5) contrast(1.1)' : (failure ? 'grayscale(.55) brightness(.66) contrast(1.15)' : (success ? 'saturate(1.35) contrast(1.05)' : 'none')))),
        order: i < 2 ? i : i + 1,
        shout,
        label: c.label,
        bgColor: (counting && vote.most === i) ? '#EDE31B' : ((counting && vote.least === i) ? '#3E4C6B' : (psi ? '#FCEDF5' : failure ? '#3E4C6B' : success ? '#EDE31B' : SEAT_TONE[c.who])),
        innerPE: isTarget ? 'none' : 'auto',
        popLabel: LABEL[c.pop],
        landing: c.landing,
        rolling,
        reelShift: 'translateY(-' + Math.round(c.reelY || 0) + 'px)',
        reelBlur: (Math.min(2.2, (c.reelSpeed || 0) * 2.4)).toFixed(2) + 'px',
        reelDigits: Array.from({length:42}, (_, k) => ({n: (k % 6) + 1})),
        impactInk: success ? '#EDE31B' : (failure ? '#E23A3A' : '#F6A7CA'),
        panelAnim: c.broken ? 'tbp-brkshudder .28s ease-in-out infinite' : (c.landing ? 'tbp-hit .34s ease-out' : 'none'),
        boxAnim: c.landing ? 'tbp-hit .34s ease-out' : 'none',
        dieAnim: rolling ? 'tbp-shake .16s infinite' : (rolled ? 'tbp-land .42s cubic-bezier(.2,1.4,.4,1)' : 'none'),
        toneOpacity: rolling ? 0.5 : 0.14,
        burstOpacity: rolling ? 0.18 : 0,
        psychicArmed: rollMode && !psi && !rolling && (c.psychic || c.psiExit),
        psiAnim: c.psiExit ? 'tbp-popout .2s ease-in forwards' : 'tbp-pop .22s ease-out',
        showExclaim: !!ch && !ch.resolved && i === ch.by,
        showCancel: pickPhase && i === ch.by,
        showArrow: isTarget,
        arrowRel: pickPhase && isTarget ? (i === SEATS[ch.by].friend ? 'BEST FRIEND' : 'RIVAL') : '',
        pickGlow: isTarget ? 'tbp-pickglow 1s ease-in-out infinite' : 'none',
        boxCursor: isTarget ? 'pointer' : 'default',
        boxClick: () => { if (isTarget) this.selectTarget(i); },
        dramaPop: c.dramaPop,
        voteAssign: voteActive && vote.phase === 'assign',
        voteCount: counting,
        isPlayerCard: i === player,
        votePlayerAlloc: vote ? (vote.alloc[player][i] || 0) : 0,
        voteCanInc: vote ? playerSpent < playerCap : false,
        voteInc: () => this.voteAdjust(i, 1),
        voteDec: () => this.voteAdjust(i, -1),
        voteTick: vote ? vote.tick[i] : 0,
        voteMost: counting && vote.most === i,
        voteLeast: counting && vote.least === i,
        voteTie: voteActive && vote.phase === 'tiebreak' && vote.rollPool.indexOf(i) >= 0,
        voteGrey: (voteActive && vote.phase === 'assign' && i === player) ? playerSpent : 0,
        voteIncOpacity: (vote && playerSpent >= playerCap) ? 0.35 : 1,
        voteBadgeBg: (counting && vote.most === i) ? '#EDE31B' : ((counting && vote.least === i) ? '#3E4C6B' : '#FDFCFC'),
        voteBadgeInk: (counting && vote.least === i) ? '#FDFCFC' : '#231F20',
        voteBadgeAnim: (counting && (vote.most === i || vote.least === i)) ? 'tbp-hit .5s ease-out' : 'none',
        voteRankShow: counting && (vote.most === i || vote.least === i),
        voteRank: (counting && vote.most === i) ? 'MOST POPULAR' : 'LEAST POPULAR',
        voteRankInk: (counting && vote.most === i) ? '#B4322C' : '#3E4C6B',
        voteRollShow: counting && vote.rolls && vote.rolls[i] != null,
        voteRollValue: (counting && vote.rolls && vote.rolls[i] != null) ? vote.rolls[i] : '',
        voteRollAnim: (voteActive && vote.phase === 'tiebreak' && vote.rollSpin && vote.rollPool.indexOf(i) >= 0) ? 'tbp-shake .16s infinite' : 'none',
        popEnter: () => this.patch(i, {popHover: true}),
        popLeave: () => this.patch(i, {popHover: false}),
        popHover: c.popHover,
        showResult,
        fx: {success: success || (counting && vote.most === i), failure: failure || (counting && vote.least === i), psi},
        faceText: psi ? '脳' : c.face,
        showDie: rolled || psi,
        rollMode,
        rollLocked: !rollMode && !(rolling || rolled || psi),
        showRollLabel: rollMode && !(rolling || rolled || psi) && !c.psychic,
        showPsiCost: rollMode && !(rolling || rolled || psi) && c.psychic,
        rollReadyAnim: needsBreak ? 'tbp-breakblink .6s steps(1) infinite' : 'none',
        rollBorder: '#FDFCFC',
        quirkPicker: [
          {label: '✕', key: null, title: 'No Quirk applies'},
          {label: 'A', key: 0, title: 'Quirk A — +1'},
          {label: 'B', key: 1, title: 'Quirk B — +1'}
        ].map(o => ({
          label: o.label, title: o.title,
          bg: quirkSel === o.key ? (o.key === null ? '#231F20' : '#EDE31B') : '#FDFCFC',
          ink: quirkSel === o.key && o.key === null ? '#FDFCFC' : '#231F20',
          pick: () => this.reset(i, {quirk: o.key})
        })),
        quirkText: quirkSel === 0 || quirkSel === 1 ? c.quirks[quirkSel] : '',
        showOptions: rollMode && !(rolling || rolled || psi) && !c.psychic && !c.psiExit && !needsBreak,
        bubbleShow: rollMode && !needsBreak && !((c.psychic || c.psiExit) && !(rolling || rolled || psi)),
        bubbleResult: rolled || psi,
        bubbleRolling: rolling,
        bubbleQuirk: !(rolling || rolled || psi) && (quirkSel === 0 || quirkSel === 1),
        bubbleNone: !(rolling || rolled || psi) && quirkSel === null,
        bubbleBg: (rolling || rolled || psi) ? (rolling ? '#231F20' : (failure ? '#3E4C6B' : (psi ? '#FDFCFC' : '#F6CFD8'))) : (quirkSel === null ? 'transparent' : '#FDFCFC'),
        bubbleBorder: (!(rolling || rolled || psi) && quirkSel === null) ? 'rgba(35,31,32,.35)' : '#231F20',
        bubbleBorderStyle: (!(rolling || rolled || psi) && quirkSel === null) ? 'dashed' : 'solid',
        bubbleTail: (rolling || rolled || psi) || quirkSel === 0 || quirkSel === 1,
        showClose: rolled || psi,
        rollPanelBg: needsBreak ? '#E23A3A' : ((rolling || rolled || psi) ? '#FDFCFC' : (c.psychic ? '#EDE31B' : (rollMode ? '#EDE31B' : '#F3EFE4'))),
        rollLabelInk: needsBreak ? '#FDFCFC' : '#231F20',
        rollCursor: (rollMode && !c.psychic) ? 'pointer' : 'default',
        rollHoverInk: '#231F20',
        targetDice: [1,2,3,4,5,6].filter(n => n >= t).map(n => ({n, pips: pipsFor(n, '#231F20')})),
        bonds: [
          Object.assign(faceOf(SEATS[c.friend].who), {name: SEATS[c.friend].label, tag: 'BEST FRIEND', tagInk: '#F0A8B8', icon: '💗', open: c.bondHover === 0, enter: () => this.patch(i, {bondHover: 0}), leave: () => this.patch(i, {bondHover: null})}),
          Object.assign(faceOf(SEATS[c.rival].who), {name: SEATS[c.rival].label, tag: 'RIVAL', tagInk: '#A9BEDC', icon: '💔', open: c.bondHover === 1, enter: () => this.patch(i, {bondHover: 1}), leave: () => this.patch(i, {bondHover: null})})
        ],
        psiAfford: dv >= (Number(c.psiCost) || 2),
        psiSlots: [
          {top: 'PSI', bottom: 'STORM!', name: PSI_SHARED[0].name, bg: PSI_SHARED[0].bg},
          {top: 'BRAIN', bottom: 'POP!', name: PSI_SHARED[1].name, bg: PSI_SHARED[1].bg},
          {top: 'PSI', bottom: c.psi.short, name: c.psi.name, bg: '#E8A0A0'}
        ].map((p, k) => {
          const afford = dv >= (Number(c.psiCost) || 2);
          const hov = afford && c.psiHover === k;
          return Object.assign({}, p, {
            slabBg: hov ? '#FDFCFC' : p.bg,
            slabBorder: hov ? '#FDFCFC' : '#231F20',
            slabShadow: hov ? '0 0 0 4.5px #231F20, 0 5px 0 rgba(35,31,32,.4)' : '0 5px 0 rgba(35,31,32,.4)',
            nameColor: hov ? '#231F20' : '#FDFCFC',
            nameStroke: hov ? '0px' : '3px',
            dotOpacity: hov ? 0.2 : 0.15,
            bob: afford ? ('tbp-bob 2.1s ease-in-out infinite ' + (k * 0.25) + 's') : 'none',
            cursor: afford ? 'pointer' : 'not-allowed',
            filter: afford ? 'none' : 'grayscale(1) opacity(.6)',
            tipName: afford ? p.name : 'Not enough Drama!',
            tipDesc: afford ? (k === 2 ? c.psi.desc : PSI_SHARED[k].desc) : 'Costs ' + (Number(c.psiCost) || 2) + ' Drama to use this power.',
            tipInk: afford ? (k === 2 ? '#E8A0A0' : (k === 1 ? '#9CB39A' : '#A9BEDC')) : '#E23A3A',
            enter: () => this.patch(i, {psiHover: k}),
            leave: () => this.patch(i, {psiHover: null}),
            use: () => { if (afford) this.usePsi(i, k); }
          });
        }),
        psiCostLabel: (Number(c.psiCost) || 2) + '!?',
        psiOpen: c.psiHover === 0 || c.psiHover === 1 || c.psiHover === 2,
        psiTipName: (c.psiHover === 0 || c.psiHover === 1 || c.psiHover === 2) ? (dv >= (Number(c.psiCost)||2) ? (c.psiHover === 2 ? c.psi.name : PSI_SHARED[c.psiHover].name) : 'Not enough Drama!') : '',
        psiTipDesc: (c.psiHover === 0 || c.psiHover === 1 || c.psiHover === 2) ? (dv >= (Number(c.psiCost)||2) ? (c.psiHover === 2 ? c.psi.desc : PSI_SHARED[c.psiHover].desc) : 'Costs ' + (Number(c.psiCost)||2) + ' Drama to use this power.') : '',
        psiTipInk: dv >= (Number(c.psiCost)||2) ? (c.psiHover === 2 ? '#E8A0A0' : (c.psiHover === 1 ? '#9CB39A' : '#A9BEDC')) : '#E23A3A',
        resultWord: rolling ? 'ROLLING…' : (c.breakResult ? 'BREAK!' : (psi ? (c.psiUsed || 'PSI') : (success ? 'SUCCESS' : 'FAILURE'))),
        resultInk: rolling ? '#EDE31B' : (c.breakResult ? '#E23A3A' : (failure ? '#FDFCFC' : '#231F20')),
        narratorLine: rolling ? 'Rolling the die…' : (c.breakResult ? 'Her PSI lashes out of control. The Headmaster narrates.' : (psi ? 'Spend Drama — no roll needed.' : (success ? 'Best Friend narrates the outcome.' : 'Rival narrates the outcome.'))),
        buttonLabel: needsBreak ? 'BREAK!' : 'Roll!',
        psiCostTop: 'COST',
        psiCostBig: (Number(c.psiCost) || 2) + '!?',
        narratorPsi: c.psiUsed,
        tools: [
          {icon: 'assets/act-psi.png', label: 'Use PSI', open: c.iconHover === 0, cursor: rollMode ? 'pointer' : 'help',
           press: 'translateY(0) scale(1)',
           filter: rollMode ? (c.psychic ? 'drop-shadow(0 0 7px rgba(246,167,202,1)) saturate(1.35)' : 'none') : DIM,
           click: () => {
             if (this.state.rollMode !== i) return;
             if (c.psychic) { this.patch(i, {psychic: false, psiExit: true}); clearTimeout(this.timers[i + 'p']); this.timers[i + 'p'] = setTimeout(() => this.patch(i, {psiExit: false}), 220); }
             else this.reset(i, {psychic: true});
           },
           enter: () => this.patch(i, {iconHover: 0}), leave: () => this.patch(i, {iconHover: null})},
          {icon: 'assets/act-challenge.png', label: 'Call a Challenge', open: c.iconHover === 1, cursor: canCall ? 'pointer' : 'help', press: 'translateY(0) scale(1)',
           filter: canCall ? 'none' : DIM,
           click: () => this.callChallenge(i), enter: () => this.patch(i, {iconHover: 1}), leave: () => this.patch(i, {iconHover: null})},
          {icon: 'assets/act-vote.png', label: !this.state.voteEnabled ? 'Class Vote — disabled' : 'Class Vote', open: c.iconHover === 2, cursor: canVote ? 'pointer' : 'help', press: 'translateY(0) scale(1)',
           filter: canVote ? 'none' : DIM,
           click: () => this.startVote(i), enter: () => this.patch(i, {iconHover: 2}), leave: () => this.patch(i, {iconHover: null})}
        ].map(tl => c.broken ? Object.assign({}, tl, {cursor: 'not-allowed', filter: 'grayscale(1) opacity(.3)', open: false, click: () => {}}) : tl),
        dramaSegs: Array.from({length:5}, (_, row) => {
          const ramp = ['#F7EC7A', '#EDE31B', '#F2C41E', '#E08A22', '#B4322C'];
          const level = 5 - row;
          const lit = dv >= level;
          const grey = (voteActive && vote.phase === 'assign' && i === player) ? (lit && level > dv - playerSpent) : false;
          return {
            bg: c.broken ? '#E23A3A' : (grey ? '#FDFCFC' : (lit ? ramp[level - 1] : '#2b2527')),
            dash: lit ? '#231F20' : '#e6dfd6',
            pipBorder: lit ? '#FDFCFC' : '#6b6467',
            pipAnim: (lit && max) ? 'tbp-pip .5s ease-in-out infinite ' + (row * 0.07).toFixed(2) + 's' : 'none',
            coinOpacity: c.broken ? 1 : (lit ? 1 : 0.18),
            chaseAnim: c.broken ? ('tbp-breakblink2 .5s ease-in-out infinite ' + (row * 0.08).toFixed(2) + 's') : ((lit && max) ? 'tbp-chase .45s ease-in-out infinite ' + ((4 - row) * 0.09).toFixed(2) + 's' : 'none')
          };
        }),
        meterA: i === 0,
        meterB: i === 1,
        meterC: i === 2,
        meterD: i === 3,
        isMax: max,
        broken: !!c.broken,
        brokenLevitate: c.broken ? 'tbp-brklevitate 2.6s ease-in-out infinite' : 'none',
        brokenShudder: c.broken ? 'tbp-brkshudder .28s ease-in-out infinite' : 'none',
        brokenGlow: c.broken ? 'tbp-brkglow 1.4s ease-in-out infinite' : 'none',
        cardBorder: c.broken ? '#E23A3A' : '#231F20',
        fillPct: (dv * 20) + '%',
        badgeA: max ? 'MAX' : '!?',
        badgeC: c.broken ? 'BRK' : (max ? 'MAX' : '!?'),
        badgeBg: c.broken ? '#E23A3A' : '#EDE31B',
        badgeInk: c.broken ? '#FDFCFC' : '#231F20',
        gaugeBorder: c.broken ? '#E23A3A' : '#231F20',
        badgeSize: c.broken ? '9px' : (max ? '8px' : '10px'),
        badgeD: max ? '喝' : '電',
        maxAnim: max ? 'tbp-maxflash .55s steps(1,end) infinite' : 'none',
        tubeAnim: max ? 'tbp-tubeglow .8s ease-in-out infinite' : 'none',
        iconBg: !dv ? '#EFE6C8' : (max ? '#B4322C' : '#EDE31B'),
        iconInk: max ? '#FDFCFC' : '#231F20',
        iconInk2: max ? '#EDE31B' : '#FDFCFC',
        gaugeAnim: c.broken ? 'tbp-brkshudder .28s ease-in-out infinite' : ((c.venting || c.landing) ? 'tbp-hit .34s ease-out' : 'none'),
        venting: c.venting,
        ventGlow: c.venting ? '0 0 12px rgba(226,58,58,.85)' : 'none',
        bumpDrama: () => this.bumpDrama(i),
        roll: needsBreak ? (() => this.breakOut(i)) : (() => this.roll(i)),
        cyclePop: () => this.reset(i, {pop: ORDER[(ORDER.indexOf(c.pop) + 1) % 3]}),
        toggleDetail: () => this.reset(i, {detail: !c.detail}),
        togglePsychic: () => { if (this.state.rollMode === i) this.reset(i, {psychic: !c.psychic}); },
        dramaEnter: () => this.patch(i, {dramaHover: true}),
        dramaLeave: () => this.patch(i, {dramaHover: false}),
        dramaHover: c.dramaHover,
        diceEnter: () => this.patch(i, {diceHover: true}),
        diceLeave: () => this.patch(i, {diceHover: false}),
        diceHover: c.diceHover,
        cancelChallenge: () => this.cancelChallenge(),
        closeResult: () => { this.reset(i, {}); this.setState({rollMode: null, challenge: null}); }
      };
    });
    const rollPicker = [{label:'NONE', idx:null}].concat(SEATS.map((s, k) => ({label: s.label, idx: k}))).map(o => {
      const on = active === o.idx;
      return {
        label: o.label,
        bg: on ? '#EDE31B' : 'transparent',
        ink: on ? '#231F20' : '#FDFCFC',
        border: on ? '#EDE31B' : 'rgba(253,252,252,.4)',
        pick: () => { if (o.idx !== null) this.reset(o.idx, {quirk: null, psychic: false}); this.setState({rollMode: o.idx, challenge: null, vote: null}); }
      };
    });
    const playerPicker = SEATS.map((s, k) => ({
      label: s.label, on: player === k,
      bg: player === k ? '#F6A7CA' : 'transparent',
      ink: player === k ? '#231F20' : '#FDFCFC',
      border: player === k ? '#F6A7CA' : 'rgba(253,252,252,.4)',
      pick: () => this.setPlayer(k)
    }));
    const psiCostPicker = this.state.chars.map((c, k) => ({
      label: SEATS[k].label, cost: (Number(c.psiCost) || 2) + '!?',
      dec: () => this.setPsiCost(k, (Number(c.psiCost) || 2) - 1),
      inc: () => this.setPsiCost(k, (Number(c.psiCost) || 2) + 1)
    }));
    const remaining = playerCap - playerSpent;
    const secs = voteActive && vote.clock != null ? vote.clock : 60;
    const voteBar = {
      show: voteActive && vote.phase === 'assign',
      remaining,
      remainingLabel: remaining + ' LEFT',
      pips: Array.from({length: Math.max(playerCap, 1)}, (_, k) => ({
        bg: k < remaining ? '#B4322C' : 'transparent',
        border: k < remaining ? '#231F20' : 'rgba(35,31,32,.35)'
      })),
      clock: secs < 10 ? '0' + secs : String(secs),
      clockInk: secs <= 10 ? '#E23A3A' : '#EDE31B',
      clockAnim: secs <= 10 ? 'tbp-pulse .9s ease-in-out infinite' : 'none',
      cap: playerCap,
      topOffset: '160px',
      playerLabel: SEATS[player].label,
      ready: () => this.finishVote()
    };
    const TONE = {momo:'#F6A7CA', midori:'#9CB39A', ao:'#A9BEDC', murasaki:'#C8A8D8'};
    const rTick = voteActive && vote.tick ? vote.tick : [0,0,0,0];
    const rMax = Math.max(1, Math.max.apply(null, rTick));
    const voteRows = !voteActive ? [] : SEATS.map((s, k) => k).sort((a, b) => rTick[b] - rTick[a]).map(k => {
      const s = SEATS[k], n = rTick[k];
      const isMost = vote.most === k, isLeast = vote.least === k;
      const rollV = vote.rolls ? vote.rolls[k] : null;
      const inBar = n > 0;
      return Object.assign({
        label: s.label, tone: TONE[s.who],
        rowBg: isMost ? 'rgba(180,50,44,.18)' : (isLeast ? 'rgba(62,76,107,.35)' : 'transparent'),
        rowBorder: isMost ? '#B4322C' : (isLeast ? '#A9BEDC' : 'rgba(239,230,200,.2)'),
        rowAnim: (isMost || isLeast) ? 'tbp-hit .5s ease-out' : 'none',
        ink: isLeast ? '#A9BEDC' : '#EFE6C8',
        rankShow: isMost || isLeast,
        rank: isMost ? 'MOST POPULAR' : 'LEAST POPULAR',
        rankInk: isMost ? '#EDE31B' : '#A9BEDC',
        barPct: Math.round((n / rMax) * 100) + '%',
        barBg: isMost ? '#B4322C' : (isLeast ? '#A9BEDC' : '#EDE31B'),
        countIn: inBar ? n : '',
        countInk: isMost ? '#EFE6C8' : '#231F20',
        countOut: inBar ? '' : '0',
        outInk: isLeast ? '#A9BEDC' : 'rgba(239,230,200,.55)',
        rollShow: rollV != null,
        roll: rollV == null ? '' : rollV,
        rollBg: isLeast ? '#3E4C6B' : '#EFE6C8',
        rollInk: isLeast ? '#EFE6C8' : '#231F20',
        rollAnim: vote.rollSpin ? 'tbp-pulse .3s ease-in-out infinite' : 'none'
      }, faceOf(s.who));
    });
    const voteResult = {
      rows: voteRows,
      show: voteActive && (vote.phase === 'count' || vote.phase === 'tiebreak' || vote.phase === 'done'),
      title: voteActive && vote.phase === 'tiebreak' ? (vote.rollMode === 'high' ? 'Tie for first!' : (vote.rollMode === 'low' ? 'Tie for last!' : 'It’s a tie!')) : 'The votes are in!',
      showClose: voteActive && vote.phase === 'done',
      close: () => this.closeVote()
    };
    const voteToggle = {
      on: this.state.voteEnabled,
      label: this.state.voteEnabled ? 'ENABLED' : 'DISABLED',
      bg: this.state.voteEnabled ? '#9CB39A' : 'transparent',
      ink: this.state.voteEnabled ? '#231F20' : '#FDFCFC',
      border: this.state.voteEnabled ? '#9CB39A' : 'rgba(253,252,252,.4)',
      toggle: () => this.toggleVoteEnabled()
    };
    const dLead = this.state.focusIdx === 2;
    const demonIn = this.state.demonIn || dLead;
    const demonPick = pickPhase && demonIn;
    const demonChallenged = !!ch && ch.rel === 'demon' && !ch.resolved;
    const demon = {
      present: demonIn, absent: !demonIn,
      name: DEMON.name, goal: DEMON.goal,
      status: demonChallenged ? 'CHALLENGED' : 'DEMON',
      cursor: demonPick ? 'pointer' : 'pointer',
      glow: demonPick ? 'tbp-pickglowred 1s ease-in-out infinite' : (demonChallenged ? 'tbp-active 1.1s ease-in-out infinite' : 'none'),
      showArrow: demonPick,
      click: () => { if (demonPick) this.selectTarget('demon'); else if (!dLead) this.toggleDemon(); }
    };

    const dr = this.state.demonRoll;
    const dt = this.demonTarget();
    const demonRoll = {
      open: !!dr,
      ready: !!dr && dr.phase === 'ready',
      rolling: !!dr && dr.phase === 'rolling',
      settled: !!dr && dr.phase === 'done',
      face: dr && dr.face ? String(dr.face) : '?',
      faceInk: dr && dr.phase === 'done' ? (dr.success ? '#E23A3A' : '#9CB39A') : '#EFE6C8',
      sigilOpacity: dr && dr.phase === 'ready' ? .55 : .1,
      faceOpacity: dr && dr.phase === 'done' ? 1 : 0,
      reelShift: 'translateY(-' + Math.round((dr && dr.reelY) || 0) + 'px)',
      reelBlur: (Math.min(3.4, ((dr && dr.reelSpeed) || 0) * 3.6)).toFixed(2) + 'px',
      reelDigits: Array.from({length: 42}, (_, k) => ({n: (k % 6) + 1})),
      modBase: '4 BASE',
      modGoals: '−' + dt.unresolved + ' UNRESOLVED GOAL' + (dt.unresolved === 1 ? '' : 'S'),
      modGood: '+' + this.state.goodEnd + ' GOOD END',
      goalsOpacity: dt.unresolved ? 1 : .3,
      goodOpacity: this.state.goodEnd ? 1 : .3,
      pips: [1,2,3,4,5,6].map(n => {
        const hit = n === 6 || (n !== 1 && n >= dt.target);
        const landed = dr && dr.phase === 'done' && dr.face === n;
        return {n: String(n),
          bg: landed ? '#EFE6C8' : (hit ? '#231F20' : 'transparent'),
          border: landed ? '#EDE31B' : '#231F20',
          ink: landed ? '#231F20' : (hit ? '#EFE6C8' : 'rgba(35,31,32,.45)')};
      }),
      verdictInk: dr && dr.success ? '#E23A3A' : '#9CB39A',
      mark: dr && dr.success != null ? (dr.success ? '+1 BAD END' : '+1 GOOD END') : '',
      vanish: dr && dr.success != null && !dLead ? 'The Demon vanishes. It will not return until the Lead changes.' : 'Demon-led Scene — the Demon does not retreat.',
      roll: () => this.rollDemon(),
      close: () => this.setState({demonRoll: null}),
      stop: (e) => { if (e && e.stopPropagation) e.stopPropagation(); }
    };

    const gearToggle = {click: () => this.toggleDebug(), ink: this.state.debugVisible ? '#EDE31B' : '#FDFCFC'};

    const good = this.state.goodEnd, bad = this.state.badEnd;
    const order = [0,1,2,3,0,1,2,3];
    const scenePos = this.state.scenePos;
    const leadIdx = this.state.leadOverride == null ? order[scenePos] : this.state.leadOverride;
    const ledCounts = this.state.led ? this.state.led : SEATS.map((s, k) => order.slice(0, scenePos + 1).filter(x => x === k).length);
    const doneMap = this.state.goalsDone;
    const scenesLeft = Math.max(0, 8 - ledCounts.reduce((a, b) => a + b, 0));
    const goodNeeded = Math.max(0, 4 - good);
    const demonWarn = scenesLeft < goodNeeded;
    const rail = {
      scenesLeft: scenesLeft,
      sceneInk: demonWarn ? '#E23A3A' : '#EFE6C8',
      demonWarn: demonWarn,
      demonName: DEMON.name, demonGoal: DEMON.goal,
      goodCount: good, badCount: bad,
      goodSquares: [1,2,3].map(k => ({bg: good >= k ? '#9CB39A' : 'rgba(239,230,200,.14)', click: () => this.setEnd('good', k)})),
      badSquares: [3,2,1].map(k => ({bg: bad >= k ? '#B4322C' : 'rgba(239,230,200,.14)', click: () => this.setEnd('bad', k)})),
      bigBg: good > 3 ? '#9CB39A' : (bad > 3 ? '#B4322C' : 'rgba(239,230,200,.14)'),
      bigBorder: good > 3 ? '#9CB39A' : (bad > 3 ? '#E23A3A' : '#EFE6C8'),
      bigGoodOpacity: good > 3 ? 1 : 0,
      bigBadOpacity: bad > 3 ? 1 : 0,
      bigClick: () => { if (good === 3) this.setEnd('good', 4); else if (bad === 3) this.setEnd('bad', 4); else if (good > 3) this.setEnd('good', 4); else if (bad > 3) this.setEnd('bad', 4); },
      seats: SEATS.map((s, k) => {
        const scenesDone = ledCounts[k];
        const cleared = doneMap[k].filter(Boolean).length;
        return Object.assign({
          starOpacity: cleared ? 1 : 0,
          starBadges: Array.from({length: cleared || 0}, (_, si) => ({i: si})),
          tone: SEAT_TONE[s.who],
          ring: leadIdx === k ? '#EDE31B' : 'transparent',
          opacity: leadIdx === k ? 1 : .55,
          pips: [1,2].map(n => ({
            bg: scenesDone >= n ? (leadIdx === k ? '#EDE31B' : '#EFE6C8') : 'transparent',
            border: leadIdx === k ? '#EDE31B' : '#EFE6C8'
          })),
          click: () => this.setState({leadOverride: k})
        }, faceOf(s.who));
      })
    };
    const ui = this.state.ui;
    const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
    const pc = this.state.chars[player];
    const me = Object.assign(faceOf(pc.who), {
      tone: SEAT_TONE[pc.who],
      name: pc.label,
      openDiary: () => this.setUi({diary: true}),
      openRulebook: () => this.setUi({rulebook: true}),
      diaryPress: ui.diaryPress ? 'scale(1.08)' : 'scale(1)',
      helpPress: ui.helpPress ? 'scale(1.08)' : 'scale(1)',
      diaryEnter: () => this.setUi({diaryPress: true}),
      diaryLeave: () => this.setUi({diaryPress: false}),
      helpEnter: () => this.setUi({helpPress: true}),
      helpLeave: () => this.setUi({helpPress: false})
    });
    const rulebook = {
      open: ui.rulebook,
      close: () => this.setUi({rulebook: false}),
      stop,
      title: RULES[ui.rbTab].title,
      tabs: RULES.map((r, k) => ({label: r.label, ink: ui.rbTab === k ? '#231F20' : '#EFE6C8', bg: ui.rbTab === k ? '#EDE31B' : 'transparent', pick: () => this.setUi({rbTab: k})})),
      blocks: RULES[ui.rbTab].blocks.map(b => ({isH: b.t === 'h', isP: b.t === 'p', isLi: b.t === 'li', text: b.text}))
    };
    const ex = BIOS[pc.who];
    const fr = SEATS[pc.friend], rv = SEATS[pc.rival];
    const diary = Object.assign(faceOf(pc.who), {
      open: ui.diary,
      close: () => this.setUi({diary: false}),
      stop,
      name: pc.label,
      pop: LABEL[pc.pop],
      quirks: pc.quirks.map(q => ({text: q})),
      goals: ex.goals.map((g, k) => {
        const dn = this.state.goalsDone[player][k];
        return {text: g, done: dn, strike: dn ? 'line-through' : 'none', ink: dn ? 'rgba(35,31,32,.45)' : '#231F20'};
      }),
      psiName: pc.psi.name,
      psiDesc: pc.psi.desc,
      bio: ex.bio,
      friend: Object.assign(faceOf(fr.who), {name: fr.label}),
      rival: Object.assign(faceOf(rv.who), {name: rv.label})
    });
    const lc = LOCATIONS[this.state.locIdx % LOCATIONS.length];
    const subs = lc.subs;
    const leadSeat = SEATS[leadIdx];
    const fi = this.state.focusIdx;
    const vsDemon = fi === 1, demonLead = fi === 2;
    const demonFocus = demonLead;
    const loc = Object.assign(faceOf(demonLead ? '' : leadSeat.who), {
      show: !voteBar.show && !voteResult.show,
      img: lc.img, name: lc.name,
      sub: this.state.subText == null ? subs[this.state.subIdx % subs.length] : this.state.subText,
      cyclePlace: () => this.setState(s => ({locIdx: (s.locIdx + 1) % LOCATIONS.length, subIdx: 0, subText: null})),
      cycleSub: () => this.setState(s => ({subIdx: (s.subIdx + 1) % LOCATIONS[s.locIdx % LOCATIONS.length].subs.length, subText: null})),
      cycleFocus: () => this.setState(s => ({focusIdx: (s.focusIdx + 1) % 3})),
      focusKind: demonLead ? 'LEAD · THE DEMON' : 'LEAD',
      focusName: demonLead ? DEMON.name : leadSeat.label,
      focusInk: demonLead ? '#E23A3A' : '#EDE31B',
      focusChipBg: demonLead ? '#B4322C' : SEAT_TONE[leadSeat.who],
      focusDemon: demonLead, focusGoal: !demonLead,
      goalKind: vsDemon ? 'GOAL · THE DEMON' : 'GOAL',
      goalKindInk: vsDemon ? '#E23A3A' : 'rgba(239,230,200,.6)',
      goalDemon: vsDemon,
      goalText: demonLead ? DEMON.goal : (vsDemon ? '“Defeat the ' + DEMON.name + '.”' : '“' + BIOS[leadSeat.who].goals[this.state.goalIdx % 2] + '”'),
      cycleGoal: () => this.setState(s => ({goalIdx: (s.goalIdx + 1) % 2})),
    });
    const stage = {
      locScale: this.state.locScale == null ? 1 : this.state.locScale,
      voteScale: this.state.voteScale == null ? 1 : this.state.voteScale,
      resScale: this.state.resScale == null ? 1 : this.state.resScale
    };
    const focusPicker = ['GOAL', 'VS DEMON', 'DEMON LEAD'].map((label, k) => ({
      label, pick: () => this.setState({focusIdx: k}),
      bg: fi === k ? '#F6A7CA' : 'transparent', ink: fi === k ? '#231F20' : '#FDFCFC', border: fi === k ? '#F6A7CA' : 'rgba(253,252,252,.3)'
    }));
    const gm = this.buildGm(stop);
    const rowScale = this.state.rowScale == null ? 1 : this.state.rowScale;
    const ek = this.state.endKind;
    const e = ek ? EG_ENDS[ek] : null;
    const end = {
      shown: !!ek,
      close: () => this.setState({endKind: null}),
      scale: Math.min(1, (typeof window !== 'undefined' ? window.innerWidth : 1320) / 1360, (typeof window !== 'undefined' ? window.innerHeight : 900) / 940),
      kindLabel: e ? e.kindLabel : '', title: e ? e.title : '', accent: e ? e.accent : '', bg: e ? e.bg : '', icon: e ? e.icon : '',
      dots: e && e.dark ? 0.12 : 0.14,
      wash: e && e.dark
        ? 'radial-gradient(120% 95% at 50% 0%, rgba(226,58,58,.22), rgba(35,31,32,.06) 65%)'
        : 'radial-gradient(120% 90% at 50% 0%, rgba(253,252,252,.5), rgba(253,252,252,0) 60%)',
      portraitWash: e && e.dark
        ? 'linear-gradient(200deg, rgba(226,58,58,.24), rgba(35,31,32,.14) 70%)'
        : 'linear-gradient(200deg, rgba(237,227,27,.18), rgba(253,252,252,0) 65%)',
      girls: e ? EG_GIRLS.map(g => ({ ...g, filter: e.dark ? 'grayscale(.35) brightness(.94)' : 'none' })) : [],
      achievements: e ? e.achievements.map((a, n) => {
        const idx = EG_HEAD[a.who.charAt(0) + a.who.slice(1).toLowerCase()];
        return { ...a, delay: (0.4 + n * 0.12).toFixed(2) + 's', hasWinner: !a.table && idx !== undefined, isTable: !!a.table, head: idx !== undefined ? EG_GIRLS[idx].head : '' };
      }) : []
    };
    const catLabel = {type:'TYPE', power:'POWER', complication:'COMPLICATION', goal:'GOAL'};
    const locks = this.state.locks || [false,false,false,false];
    const allLocked = locks.every(Boolean);
    const lockCount = locks.filter(Boolean).length;
    const fSeat = this.state.focusSeat == null ? -1 : this.state.focusSeat;
    const fs = SEATS[fSeat] || SEATS[0];
    const setup = {
      open: this.state.setupOpen,
      scale: Math.min(1, (typeof window !== 'undefined' ? window.innerWidth : 1560) / 1600, (typeof window !== 'undefined' ? window.innerHeight : 950) / 980),
      close: () => this.closeSetup(),
      demonOpen: allLocked && this.state.picking == null,
      showGoals: this.state.picking != null,
      topOpen: allLocked,
      goalPicker: (() => {
        const k = this.state.picking == null ? 0 : this.state.picking;
        const onQuirks = this.state.pickStep === 'quirks';
        const picks = ((onQuirks ? this.state.quirkPicks : this.state.goalPicks) || {})[k] || [];
        const pool = onQuirks ? QUIRK_POOL[SEATS[k].who] : GOAL_POOL[SEATS[k].who];
        return {
          title: SEATS[k].label + (onQuirks ? ' — PICK TWO QUIRKS' : ' — PICK TWO GOALS'),
          hint: picks.length + ' of 2 chosen',
          playerName: (this.state.playerNames || {})[k] || '',
          setPlayerName: e => this.setState({playerNames: Object.assign({}, this.state.playerNames, {[k]: e.target.value})}),
          confirmOpacity: picks.length === 2 ? 1 : 0.4,
          confirm: () => this.advancePicker(k),
          cancel: () => this.setState(onQuirks ? {picking: null} : {pickStep: 'quirks'}),
          goals: pool.map((text, gi) => {
            const on = picks.indexOf(gi) >= 0;
            return {
              text, toggle: () => this.togglePick(k, gi),
              bg: on ? 'rgba(237,227,27,.14)' : 'rgba(239,230,200,.04)',
              border: on ? '#EDE31B' : 'rgba(239,230,200,.16)',
              dotBg: on ? '#EDE31B' : 'transparent',
              dotBorder: on ? '#EDE31B' : 'rgba(239,230,200,.35)',
              ink: on ? '#EFE6C8' : 'rgba(239,230,200,.72)'
            };
          })
        };
      })(),
      rolledAny: allLocked && ['type','power','complication','goal'].every(c => !this.state.spinning[c] && (this.state.rolled[c] || []).length > 0),
      rerollAll: () => this.startRoll(),
      lockPips: locks.map(l => ({bg: l ? '#EDE31B' : 'rgba(239,230,200,.16)'})),
      rosterHint: allLocked ? 'All four chosen — the Demon has been rolled above.' : (lockCount + ' of 4 chosen — tap a Student to pick her Goals.'),
      seats: SEATS.map((s, k) => {
        const lk = !!locks[k];
        return {
          label: s.label,
          portrait: 'assets/portrait-' + s.who + '.png', tone: SEAT_TONE[s.who],
          playerName: ((this.state.playerNames || {})[k] || 'PLAYER ' + (k + 1)).toUpperCase(),
          bio: BIOS[s.who].bio, psiName: s.psi.name, psiDesc: s.psi.desc,
          infoOpacity: (fSeat === k && !allLocked && this.state.picking == null) ? 1 : 0,
          blur: () => { if (this.state.picking == null && this.state.focusSeat === k) this.setState({focusSeat: -1}); },
          locked: lk,
          border: lk ? '#EDE31B' : 'rgba(239,230,200,.16)',
          lift: lk ? 'translateY(-4px)' : 'translateY(0)',
          nameInk: lk ? '#EDE31B' : '#EFE6C8',
          artFilter: lk ? 'contrast(1.08) saturate(1.1)' : 'grayscale(.55) brightness(.82)',
          artWash: lk ? 'linear-gradient(200deg, rgba(237,227,27,.14), rgba(35,31,32,0) 60%)' : 'rgba(35,31,32,.32)',
          btnBg: lk ? '#EDE31B' : 'rgba(239,230,200,.13)',
          btnInk: lk ? '#231F20' : 'rgba(239,230,200,.7)',
          btnLabel: lk ? 'CHOSEN' : 'CHOOSE',
          choose: () => { if (!allLocked) this.openGoalPicker(k); },
          focus: () => { if (this.state.picking == null && !allLocked) this.setState({focusSeat: k}); }
        };
      }),
      detail: {
        label: fs.label, tone: SEAT_TONE[fs.who],
        psiName: fs.psi.name, psiDesc: fs.psi.desc, bio: BIOS[fs.who].bio,
        quirks: fs.quirks.map(q => ({text: q}))
      },
      categories: ['type','power','complication','goal'].map(cat => {
        const list = DEMON_TABLES[cat];
        const reel = [];
        for (let n = 0; n < 20; n++) reel.push({text: list[(n * 7 + 3) % (list.length - 1)]});
        return {
          key: cat, label: catLabel[cat],
          spinning: this.state.spinning[cat], notSpinning: !this.state.spinning[cat],
          border: this.state.spinning[cat] ? 'rgba(226,58,58,.55)' : 'rgba(239,230,200,.2)',
          headBg: this.state.spinning[cat] ? '#B4322C' : 'rgba(239,230,200,.1)',
          headInk: this.state.spinning[cat] ? '#EFE6C8' : 'rgba(239,230,200,.65)',
          reel,
          reelSpeed: (this.state.speeds || {})[cat] || '.2s',
          reroll: () => this.rerollCategory(cat),
          slots: (this.state.rolled[cat] || []).map((text, idx) => ({
            text, reroll: () => this.rerollSlot(cat, idx),
            bg: idx === 0 && (this.state.rolled[cat] || []).length > 1 ? 'rgba(226,58,58,.16)' : 'rgba(239,230,200,.06)',
            border: idx === 0 && (this.state.rolled[cat] || []).length > 1 ? 'rgba(226,58,58,.5)' : 'rgba(239,230,200,.16)'
          }))
        };
      }),
      name: this.state.demonNameDraft,
      goalText: this.state.demonGoalDraft,
      setName: e => this.setState({demonNameDraft: e.target.value}),
      setGoal: e => this.setState({demonGoalDraft: e.target.value}),
      startOpacity: (this.state.demonNameDraft.trim() && this.state.demonGoalDraft.trim() && ['type','power','complication','goal'].every(c => !this.state.spinning[c])) ? 1 : 0.4,
      start: () => this.launchGame()
    };
    const newGame = {open: () => this.openSetup()};
    const anchors = {
      good: el => { this._goodEl = el; if (el) requestAnimationFrame(this.measureAnchors); },
      scene: el => { this._sceneEl = el; if (el) requestAnimationFrame(this.measureAnchors); },
      goodX: (this.state.goodX || 0) + 'px',
      sceneX: (this.state.sceneX || 0) + 'px'
    };
    return {f: {anchors, gm, end, setup, newGame, cards, rollPicker, playerPicker, psiCostPicker, voteBar, voteResult, voteToggle, rail, demon, me, rulebook, diary, loc, stage, focusPicker, demonRoll, stageBg: dLead ? '#4A1418' : '#EDE31B', rowScale, rowPull: Math.round(-519 * (1 - rowScale)) + 'px', debugVisible: this.state.debugVisible, gearToggle, watermarkShow: false}};
  }
}

