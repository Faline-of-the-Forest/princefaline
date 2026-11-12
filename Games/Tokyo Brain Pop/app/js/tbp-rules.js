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
  {label:'Scenes', title:'Scenes & Acts', blocks:[
    {t:'p', text:'A game is played in three Acts, best of three. In each Act every Student leads one Scene, so an Act is three or four Scenes.'},
    {t:'p', text:'Every Act opens the same way. First the Headmaster narrates a scene featuring the Demon, away from the girls: what it is after this Act, and what will happen if it is not stopped. Then comes a Class Vote, which sets Popularity and the running order for the Act: Most Popular leads first, then the middle girls by votes received (a tie is settled by a die roll), then Least Popular.'},
    {t:'p', text:'When a Scene begins, its Lead chooses where it happens (one of the four big locations, which she names), and her Focus: one of her remaining Goals, or the Demon itself. The Headmaster sees the same window and can fill it in for her. She and the Headmaster then work out the Scene together; other players may suggest, but the Lead and Headmaster decide what makes it in.'},
    {t:'p', text:'Any player may bring their Student into a Scene at any time, even mid-Scene.'},
    {t:'p', text:'A Scene should last 5–15 minutes, but the Headmaster decides when it ends. At the end, the Headmaster decides whether the Lead completed her Goal. Only one Goal can be completed per Scene, and only by the Lead.'},
    {t:'h', text:'Winning an Act'},
    {t:'p', text:'Every time the Demon is summoned and defeated, the girls mark 1. Every time it is summoned and wins, the Demon marks 1. When the Act’s last Scene ends, whoever has more marks wins the Act. The Demon wins ties, even at 0–0.'},
    {t:'p', text:'If the Act can no longer change hands (one side is ahead by more than the Demon could still catch up or pull back in the Scenes left), the Demon Retreats: it cannot be summoned again until the next Act, and the remaining Scenes are played without it. This keeps Friends from Challenging each other into a fight that is already decided.'},
    {t:'h', text:'Hail Mary & Last Chance'},
    {t:'p', text:'If the same side has won Acts 1 and 2, the game is not over yet. One more Scene is played, led by the Demon, with a single Demon Challenge that any girl may Call.'},
    {t:'li', text:'Hail Mary (the Demon is about to win): it is 1 stronger for every Goal still open at the table. Beat it and Act 2 turns to the girls, and the game goes on to Act 3. Lose and the Demon wins the game.'},
    {t:'li', text:'Last Chance (the girls are about to win): it is 1 weaker for every Goal the table has accomplished. Beat it and the girls win the game. Lose and Act 2 turns to the Demon, and the game goes on to Act 3.'},
    {t:'h', text:'The Finale'},
    {t:'p', text:'When the game is won (Act 3 ends, or one side can no longer lose it), the finale begins. If the girls won, they each describe how they defeat the Demon. If the Demon won, it describes how it achieves its goal. Then comes the Good End or the Bad End.'}
  ]},
  {label:'Students', title:'Students', blocks:[
    {t:'h', text:'Quirks'},
    {t:'p', text:'A Quirk can be a trait, a special interest, a strange power, a relationship, a possession, or an embarrassing secret. Choose two at the start — never more. In a Challenge, if a Quirk is relevant, lower the number you need to roll by 1.'},
    {t:'h', text:'Goals'},
    {t:'p', text:'At the start of each episode, choose two Goals your Student wants to accomplish. The Demon is strengthened by every unresolved Goal, so choose ones you can actually finish.'},
    {t:'p', text:'A Goal should always be possible. If the story turns so that a Goal can no longer be completed as written, the Headmaster reinterprets it in a way that still can be — the Goal changes shape, it never becomes a dead end.'},
    {t:'h', text:'Friend & Rival'},
    {t:'p', text:'Every pair of Students either shares a bond or does not. A bond is always MUTUAL: if she is your Friend, you are her Friend. Some pairs are both Friend and Rival at once.'},
    {t:'p', text:'The bonds are fixed for each line-up rather than rolled — who is Friends with whom depends only on which girls are playing. Every Student always has at least one Friend and at least one Rival, though not always exactly one of each.'},
    {t:'p', text:'If you are Friend AND Rival with someone, you choose which you are Calling as each time you Call a Challenge on her. Nothing else about the Challenge changes.'},
    {t:'p', text:'Your Friends and Rivals are the only Students you can Call a Challenge on — and only while one of them is the Scene’s Lead. The Lead is the only Student who can be Challenged.'}
  ]},
  {label:'Challenges', title:'Challenges', blocks:[
    {t:'p', text:'At any point in a Scene, a Student may Call a Challenge on a Friend or a Rival — but only on the Scene’s Lead, who is the only Student in the spotlight — explaining how it complicates that Student’s attempt at the Scene’s focus. The Headmaster may veto an unjustified Challenge; if allowed, the caller immediately gains 1 Drama. A Student at 5 Drama (the max) cannot Call.'},
    {t:'p', text:'Rival: explains how the situation complicates the action — never involving the Demon. Friend: explains how today’s Demon works against the action.'},
    {t:'p', text:'While the Demon is in the Scene, the Students cannot Challenge each other. The Demon is the only one who can be Challenged until it leaves.'},
    {t:'h', text:'Resolving a Challenge'},
    {t:'p', text:'The Challenged Student rolls a die. The number she needs depends on Popularity: Most Popular 3–6, Average 4–6, Least Popular 5–6. If a Quirk applies, lower the target by 1.'},
    {t:'li', text:'Success: her Friend narrates how she accomplishes it. If her Friend Called it, she gains 1 Drama.'},
    {t:'li', text:'Failure: her Rival narrates what goes wrong. If her Rival Called it, she gains 1 Drama. The Student always gains 1 Drama on a failure.'},
    {t:'li', text:'Use PSI: the Challenge succeeds automatically, no one gains Drama. Her Rival narrates the success — she does get what she wanted — AND a serious consequence caused by the PSI itself. Both, every time: the win is real, and so is the damage.'},
    {t:'p', text:'Who narrates: if she has only one Friend (or Rival), it is that Student. A Frenemy is someone who is both her Friend and her Rival. If she has a Frenemy and a Rival, the Frenemy narrates as her Friend and the Rival narrates as her Rival. If she has a Frenemy and a Friend, the Frenemy narrates as her Rival and the Friend narrates as her Friend. The screen names her.'},
    {t:'h', text:'Death'},
    {t:'p', text:'Fighting monsters is dangerous, but your Students can’t die while the Demon is undefeated. If a Student must die, she will return as a Ghost or Ghoul to keep playing.'}
  ]},
  {label:'Drama & the Vote', title:'Drama & the Class Vote', blocks:[
    {t:'p', text:'Each Student starts the game with 1 Drama. Drama is earned by Calling Challenges and never exceeds 5.'},
    {t:'h', text:'Class Vote'},
    {t:'p', text:'Popularity decides how easily a Student succeeds, and Popularity is set by a Class Vote. There is one at the start of every Act, right after the Demon’s off-screen scene, and it also sets that Act’s running order. Players cannot call Class Votes; the Headmaster may call an extra one whenever the game needs it.'},
    {t:'p', text:'During a Vote, every player secretly spends Drama on Students — split it, dump it on one, spend it on yourself, or spend none. The Student with the most spent on her becomes Most Popular; the least becomes Least Popular. Ties are settled by a die roll.'}
  ]},
  {label:'Breaking', title:'Breaking', blocks:[
    {t:'p', text:'Breaking happens when a Student gains 1 Drama while already at Max — by failing a Challenge at max Drama, or gaining a second Drama after Calling.'},
    {t:'p', text:'Nothing happens immediately. The next time she is Called to a Challenge, her only option is “Break!”: her PSI lashes out uncontrollably and catastrophically. The worst happens — the Headmaster narrates the worst possible outcome — and the Scene ends.'},
    {t:'p', text:'After Breaking, her Drama resets to 0, and the Use PSI cost drops back to 2 for everyone.'},
    {t:'p', text:'If every Student is Breaking at once, play stops. One of the girls will have to Break!, which she can do without a challenge. Play resumes once she has.'}
  ]},
  {label:'PSI', title:'PSI', blocks:[
    {t:'p', text:'Nothing good ever came of psionic powers. They will destroy your Student’s life.'},
    {t:'p', text:'Facing a Challenge, a Student may Use PSI: her action succeeds automatically, but the PSI always causes a serious consequence on top of the success. PSI may be used any time, including after a Challenge is Called on her.'},
    {t:'p', text:'Using PSI costs 2 Drama. The cost is shared by the whole table: each time anyone Uses PSI, it goes up by 1 for everyone, up to 5, so it is always the same for every Student. It drops back to 2 for everyone whenever a Student Breaks, and resets at the end of the episode. Every Student has one unique PSI ability of her own.'},
    {t:'p', text:'PSI can always be turned on the Demon, but her own business can still get in the way. With all of her Goals completed, the Demon simply fails. With 1 Goal left, the Demon still rolls at −2; with 2 Goals left, at −1.'}
  ]},
  {label:'The Demon', title:'The Demon', blocks:[
    {t:'p', text:'The Demon is the main event — the big, nasty threat the Students face before the game ends. It can be an actual demon, a monster, or a mundane threat: a disaster, a secret organization, an evil teacher, ninjas, even alien invaders. At its creation it is given a Name, a Goal, an Origin, its Abilities and its Look.'},
    {t:'p', text:'Each Act, the Demon’s off-screen scene sets out what it is after for that Act and what happens if it is not stopped.'},
    {t:'p', text:'The Demon enters when her Friend Calls a Challenge on her and narrates how the Demon complicates the action, or when the Lead makes the Demon her Focus. From then on the Headmaster narrates what the Demon does.'},
    {t:'p', text:'While the Demon is in the Scene, it is the only one who can be Challenged. The Students cannot Challenge each other until it leaves.'},
    {t:'h', text:'Challenging the Demon'},
    {t:'p', text:'Only the Scene’s Lead may Call the Demon. When the Demon is itself the Lead, any Student may Call it.'},
    {t:'p', text:'Calling a Challenge on the Demon is free — it costs no Drama, and grants none either. She narrates how the situation works against it. The Demon rolls and succeeds on 4–6, before modifiers. A defeat marks 1 for the girls this Act; a win marks 1 for the Demon.'},
    {t:'h', text:'The Demon’s Die'},
    {t:'p', text:'The Demon needs 4 or better. It can never need less than 2 or more than 6, so a 1 always fails and a 6 always succeeds.'},
    {t:'li', text:'−1 for each of the Challenger’s unresolved Goals — a distracted Student is easier prey.'},
    {t:'li', text:'+1 if the Demon is the Scene’s Focus — squaring up to it deliberately puts it on the back foot.'},
    {t:'li', text:'Hail Mary: −1 for every unresolved Goal at the whole table instead, and Focus does not count. Last Chance: +1 for every Goal the whole table has accomplished, and Focus does not count.'},
    {t:'li', text:'Use PSI: with all her Goals done the Demon fails outright; with 1 left it rolls at −2, with 2 left at −1. The Headmaster narrates the result AND a serious consequence the PSI causes.'},
    {t:'p', text:'There is only one Demon Challenge per Scene — it retreats after each one, and once it has left it cannot be summoned back that Scene, not even by a Challenge from her Friend. It returns once the Scene changes, unless the Act is already decided, in which case it has Retreated until the next Act and only Rival Challenges are left.'}
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
