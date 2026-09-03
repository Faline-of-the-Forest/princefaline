// Tokyo Brain Pop — Rulebook copy, shared by the homescreen's standalone
// Rulebook panel and the in-game Rulebook popup (play.html's own RULES
// constant). Keep the two in sync when the rules text changes.

export const RULES = [
  {label:'The Setting', title:'The Setting', blocks:[
    {t:'p', text:'Atarashi High School sits in the heart of Tokyo, where the supernatural is simply a fact of life. When demons, ghosts, and monsters attack, it falls to young women with psionic powers to fight back.'},
    {t:'p', text:'PSI is as much a curse as a gift. It manifests in strange, unsettling ways, so most psychic girls hide their powers — and many are driven to insanity before they learn to control them.'},
    {t:'li', text:'Atarashi is co-ed, but only girls manifest PSI. It was built soon after the Second World War.'},
    {t:'li', text:'There is a Club for everyone. Anything the players dream up can be a Club.'},
    {t:'li', text:'The school is full of secrets, and the longer you stay, the more of them surface.'},
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
    {t:'p', text:'At the start of the game, each Student is assigned one other Student as her Best Friend and a different one as her Rival. These bonds are not mutual — the girl assigned as your Best Friend may have you assigned as her Rival.'},
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
    {t:'p', text:'Fighting monsters is dangerous, but your Students can’t die while the Demon is undefeated. If a Student must die, she will return as a Ghost or Ghoul to keep playing.'}
  ]},
  {label:'Drama & the Vote', title:'Drama & the Class Vote', blocks:[
    {t:'p', text:'Each Student starts the game with 1 Drama. Drama is earned by Calling Challenges, never exceeds 5, and does not carry over — it resets to 1 at the start of every session.'},
    {t:'h', text:'Class Vote'},
    {t:'p', text:'Popularity decides how easily a Student succeeds, and Popularity is set by a Class Vote. Each player may call one Vote per session. The episode always opens with a Class Vote.'},
    {t:'p', text:'During a Vote, every player secretly spends Drama on Students — split it, dump it on one, spend it on yourself, or spend none. The Student with the most spent on her becomes Most Popular; the least becomes Least Popular. Ties are settled randomly.'}
  ]},
  {label:'Breaking', title:'Breaking', blocks:[
    {t:'p', text:'Breaking happens when a Student gains 1 Drama while already at Max — by failing a Challenge at max Drama, or gaining a second Drama after Calling.'},
    {t:'p', text:'Nothing happens immediately. The next time she is Called to a Challenge, her only option is “Break!”: her PSI lashes out uncontrollably and catastrophically, and the Headmaster narrates the worst possible outcome.'},
    {t:'p', text:'After Breaking, her Drama resets to 0 and her Use PSI cost resets to 2.'},
    {t:'p', text:'If every Student is Breaking at once, play stops. One of the girls will have to Break!, which she can do without a challenge. Play resumes once she has.'}
  ]},
  {label:'PSI', title:'PSI', blocks:[
    {t:'p', text:'Nothing good ever came of psionic powers. They will destroy your Student’s life.'},
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
  ]},
  {label:'Japanese Names', title:'Common Japanese Names', blocks:[
    {t:'p', text:'A quick reference if you need a name for a new Student, Demon, or NPC during play.'},
    {t:'table', headers:['Girls','Boys','Women','Men'], rows:[
      ['Aoi','Haruto','Yumiko','Hiroshi'],
      ['Rin','Sota','Keiko','Takeshi'],
      ['Yui','Yuto','Naoko','Kenji'],
      ['Hana','Ren','Junko','Masashi'],
      ['Mei','Riku','Mariko','Toshio'],
      ['Sakura','Kaito','Kyoko','Yasuo'],
      ['Akari','Hinata','Sachiko','Shigeru'],
      ['Yuna','Yamato','Tomoko','Nobuo'],
      ['Riko','Itsuki','Emiko','Katsuya'],
      ['Kaede','Daiki','Michiko','Tetsuo'],
      ['Miu','Takumi','Reiko','Masaru'],
      ['Nanami','Kenta','Hiroko','Kiyoshi'],
      ['Saki','Shota','Yoshiko','Susumu'],
      ['Koharu','Naoki','Setsuko','Tadashi'],
      ['Ichika','Ryo','Fumiko','Isamu'],
      ['Tsumugi','Kazuki','Chieko','Noboru'],
      ['Emi','Tsubasa','Harumi','Minoru'],
      ['Mio','Makoto','Akiko','Kazuo'],
      ['Nao','Hiroto','Yoko','Shinji'],
      ['Haruka','Satoshi','Miyuki','Tatsuo']
    ]}
  ]}
];
