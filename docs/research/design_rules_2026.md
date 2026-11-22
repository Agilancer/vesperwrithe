# Design rules 2026 — distilled from articles read in full

Scope: actionable rules for Vesperwrithe (2.5D SotN-style castle, 102 rooms, melee + loot).
Every rule cites a source `[n]` from the list at the end. `[SYN]` marks my own synthesis or a
number that is not stated in any source (treat those as starting values to tune, not facts).
"SotN HP" values are from the Symphony of the Night enemy table [33].

## A. Room & platform layout

- A1. Give every area one or two **dramatically primary rooms** (a tall shaft, a long stair, a great hall) and hang small subsidiary rooms off them. This is SotN's rule, not its exception: Outer Wall is mostly one vertical block, Clock Tower and Library are two big chunks plus small bits [2].
- A2. Give each area a **navigational theme** the player can feel without the map: Royal Chapel = ascent (longest unbroken stair, an uninterrupted central tower, backdrop going from forest to clouds). If rooms on an "ascending" route are mostly horizontal, the ascent is dulled [2].
- A3. **Set-up / payoff**: a long, singular structure must lead to something (the chapel stair ends in the stained-glass nave and altar). Never build a huge room whose exits lead to nondescript connectors [2].
- A4. Do not split a long hall into two rooms just to change the enemy set; fewer, larger undivided rooms read as a bigger castle than many partitions [2].
- A5. Leave **negative space** on the world map: roughly half of SotN's map rectangle is empty; a map packed edge to edge loses area identity [2]. Use compressed, low stacks (never more than 2 rooms high) only where the theme wants it (catacombs, arena under-croft) [2].
- A6. Break the rectangle: SotN has 14 irregular (non-rectangular) rooms, 9 of them primary rooms; the outline of a room is part of its level design [2]. Target ≥10 irregular rooms out of 102 [SYN].
- A7. Area budget: a classic stage is ~26 rooms + 6 optional secret rooms, built from ~5 enemy types + ~5 object types that all combine with each other ("no unitaskers") [12]. For 102 rooms: 8–10 areas of 8–14 rooms, each with 4–6 enemy types [SYN].
- A8. Jumps: if the character can clear 5 tiles, required gaps are 3–4 tiles; things the player must *not* reach are 7–8 tiles away. Never build the ambiguous 5–6 [16]. Difficulty comes from what overlaps the jump (enemies, hazards), not from jump length [16].
- A9. Avoid platforms one tile thick; chunky collision reads as safe and parses faster. Reserve thin ledges for deliberate fear [16].
- A10. Build with a consistent module (e.g. everything on 3-tile steps; safe parts on 3s, dangerous parts on 4s) so the player internalises spacing [16].
- A11. Keep **buffer space** at every entrance and exit: no enemy, hazard or blind drop in the first steps of a room [13]. An enemy standing near a room edge must not respawn on re-entry (single-kill flag) [15].
- A12. Negative space around collision is the set of all possible player moves: no incidental ceiling to bonk on during a required jump [13]. Add a low ceiling on purpose when you want to forbid jumping over an enemy [13].
- A13. Each room's last part is harder than its first; each room a little harder than the previous; then a cool-down room. Introduce → complicate → combine → test → rest [13].
- A14. First encounter with any new enemy is in a safe context (flat floor, space to retreat, nothing else on screen); second adds a pit or uneven ground; third combines with another element; fourth is the test [13][8].
- A15. Secrets: off the main axis (main path horizontal → secret above/below), always more friction to enter than the main path (breakable wall, harder jump), and one screen wide so the dead end is visible on entry [16]. A hidden wall may hide a trinket or a whole area — keep that uncertainty [32].
- A16. First room of each area: dramatic, tone readable at once, clear way forward, nothing cut off by the screen edge [16].
- A17. Symmetric rooms focus attention on the one asymmetric element (the enemy); never mirror the gameplay itself [16].
- A18. After a boss, a shortcut back to a known hub within ~50 seconds of walking [3]. Connect areas in as many places as possible, in true space (no paradox rooms); being "2 cm from where you want to be" with no link is the worst backtracking failure [23].
- A19. Start linear; the first real branch comes after the basics are taught. Make the easier branch *look* safer (a ladder instead of a gap) [3].
- A20. Leave unintended skips in unless the player can get stuck; plant a few on purpose (an enemy to bounce off, a block one tile lower) [23][14].
- A21. Pickups as language: collectibles trace the intended route early on, mark safe drops, and sit slightly off-path as optional risk; halve them late in production if they clutter [14].
- A22. Block out in plain tiles and play it before any art; only "design approved" rooms get dressed [23][31].

## B. Backgrounds & visual composition

- B1. Contrast hierarchy, in this order: (1) collision vs. backdrop — maximum contrast; backdrop colours blend into each other with no hard breaks; (2) interactables (ladders, platforms) — medium contrast; (3) enemies, projectiles, spells — highest saturation, contrast and brightness on screen [4].
- B2. **Anything that stands out is read as interactive** ("like most things that stand out, you can interact with this") [13]. So backdrop doorways, arches, stairs and ledges must sit below the interactable contrast tier: darker, desaturated, no rim light, no torch pair framing them [SYN from 4, 13]. A real door gets the full interactive treatment every time.
- B3. One consistent visual grammar for every interactive object across all areas (Dead Cells: gameplay element centred between vertical flags with a circular stone behind, brighter and with a stronger silhouette than its surroundings) [4]. Pick one frame for doors, one for save points, one for chests, and never reuse those frames as decoration [SYN].
- B4. Decoration follows rules, not scatter: torches only next to an alcove or door; divide the back wall into sections and dress each section by type [4]. Use a fixed bay rhythm (column – window – column) whose bay width equals the platform module of A10 [SYN].
- B5. The backdrop should *carry gameplay information*: fade to black above bottomless pits; draw the track of moving platforms; frame ("circle") the thing to hit with an arch; line pillars up with the player's vertical path; put two background features at the limits of an enemy patrol [15].
- B6. If a hazard's colour matches the backdrop, change the backdrop behind it (red lanterns were restaged against black) [15].
- B7. Do not light everything: one strong directional light on the room's hero object plus dim fill; where the eye lands is a decision [26]. One focal point per screen [SYN].
- B8. Hide the ceiling and add one object of known size to make a hall feel huge [26].
- B9. Palette per area: complementary pairs for interiors (confined feel), analogous ranges for exteriors (depth). Adjacent areas must not share a dominant hue [4]. Keep backdrop art greyscale + gradient map so an area can be recoloured in minutes [4].
- B10. Exteriors get depth from parallax layers, air particles and foreground cloud [4]; build layers at real Z distances so they line up with the perspective camera [25]. Backdrop tells altitude: forest → sky → clouds as the player climbs [2].
- B11. Every warm, beautiful room carries one unsettling detail in the backdrop [4].
- B12. Signal area changes with a transition piece (lift before ramparts, long tunnel before sewers) so geography stays believable [4].
- B13. Characters and backgrounds must match stylistically: Bloodstained's relight added background detail and Western fans approved, but Japanese fans said characters and backdrop no longer matched [30]. More background detail is good only below the B1 contrast ceiling [SYN].
- B14. Extend background art at least one tile past every screen edge for shake [15].
- B15. SotN area signatures worth borrowing: Marble Gallery = longest corridor, tall windows with something huge passing outside, a clock room as hub; Outer Wall = plain masonry and a full moon, deliberately bare after ornate interiors; Chapel = stained glass, pews, bell towers, long stairs; Alchemy Lab = big pillars and dark walls hiding odd geometry; Olrox's = dark elegant halls opening on a moonlit courtyard with a fountain [34].

## C. Camera

- C1. Vertical dead zone ("camera window") as tall as one standard jump, so a normal jump never moves the camera [1].
- C2. **Platform snapping**: hold Y during the jump, ease to the new floor only on landing; add a slow drift back to centre for tall windows [1].
- C3. Horizontal look-ahead: aim at a point about 25% of screen width ahead of the character; switch sides only after the player has moved past a threshold in the new direction (not on every turn — crucial in melee, where the player turns constantly) [1]. Move to the new anchor at about twice walk speed, or base speed + player speed [1].
- C4. Never go 0 → full camera speed in one frame; use an acceleration zone or smoothing. Plain lerp is ease-out; SmoothDamp-style (velocity-aware) is ease-in-out and calmer [1]. Large fast characters outrun a lerp and hide incoming enemies — speed the follow up with player velocity [1].
- C5. Clamp to room bounds (edge snapping) [1]; near the clamp enemies must not attack from the hidden side — the most dangerous spot is next to a screen edge [10].
- C6. Per-room camera regions: authored anchor/zoom per room type; boss rooms frame boss + arena (zoom-to-fit) [1].
- C7. Manual peek on existing inputs (hold up / crouch), never extra buttons [1].
- C8. Keep required action inside the frame: nothing the player must hit may sit where the attack carries them off-screen [13].
- C9. Zoom: character about 1/5–1/6 of screen height; a full weapon swing no wider than ~1/4 of screen width (SotN dropped the whip partly because it took up too much screen [36]) [SYN — ratios are mine].
- C10. Shake deliberately breaks the camera–control bond, reading as "a force bigger than the player"; reserve it for heavy hits and bosses [1].

## D. Enemy design & placement

General:
- D1. A good enemy is hard to fight *and* hard to bypass; skipping it should be as risky as fighting it [6][9].
- D2. Contact-damage enemies move toward the player but not straight at them; direct chasers are slower than the player, or faster with slow turning/recovery [6].
- D3. Never a checkmate: every attack avoidable, every pattern odd but predictable [6].
- D4. Build the room around the enemy: pusher beside a pit, arc-thrower up high, jump-forcer with something bad to land on [5].
- D5. Pair enemies that cover each other's blind zones (melee + ranged; ground + air) and run them on asynchronous timers so the combined pattern is never the same twice [5].
- D6. Each enemy gets a one-line **requirement** — the behaviour it demands from the player [9]. Two enemies in a room should have different requirements [SYN].
- D7. Density: one new idea per screen; 1–3 active threats per screen, one of them the "lead" [SYN from 13, 14]. An enemy dropped in to fill a sparse corner is noticed as noise [14].
- D8. Each twist on an enemy appears in exactly one room [10].
- D9. Speed and size trade off: big = slow and blocks the lane; small = fast and erratic [9].
- D10. SotN HP tiers to copy as ratios: fodder 1; common 9–24; armoured 32–90; first boss 200; mid bosses 400–800 [33]. As hits with an on-level weapon: fodder 1, common 2–3, armoured 4–6 [SYN].

Patterns (SotN HP in brackets; behaviour from [9][18][35]):
1. **Zombie** [1] — rises from the floor, walks straight, no attack, endless. Flat entry corridor; teaches swing timing [9][18].
2. **Bat** [1] — hangs, then crosses with small altitude corrections. Over gaps and stairs; disrupts air movement [9][18].
3. **Skeleton** [9] — short patrol, lobs a bone in a high arc. On a ledge above or below the stair you must climb [8][9].
4. **Sword skeleton** [18] — advances and slashes. First spacing duel; SotN's first two drop guaranteed weapons [35].
5. **Bone thrower / Skelerang** [12/18] — static, long straight or returning projectile. End of corridors and stairs [9][34].
6. **Axe Armor** [32–42] — shielded, slow, throws a returning axe high or low: duck or jump; unwise to leap over. Narrow corridor; classic pairing with Medusa Heads [9][10][35].
7. **Spear Guard** [20] — slow advance, guard stance, sudden lunge; stabs up/down through floors. Punishes reckless approach; stack on stacked platforms [9][35].
8. **Bloody Zombie** [24] — runs at you and swings. Rush pressure in open halls [35].
9. **Medusa Head** [12] — sine wave across the screen, endless while the player is inside a trigger zone. Over small platforms; show it first in a safe spot; stop spawning before the exit [10].
10. **Flea Man** [11] — small, erratic hops. Cramped uneven ground, one at a time; strike before it starts [8][18].
11. **Bone Pillar** [64] — stacked turret, flashes then spits 2–3 fireballs every few seconds. Attack/jump loop; on stairs its fire runs diagonally [9][18][34][35].
12. **Ghost** [11] — slow homing through walls. Two or three at once force movement in a platforming room [9][18].
13. **Merman** [10] — leaps from water, walks, spits, retreats. At water crossings, to knock you off [18].
14. **Peeping Eye** — circles the player; "requires a dance around" [9].
15. **Warg** [21] — huge, cannot be jumped; advance-and-retreat. Corridor gate [9].
16. **Bomber Armor** [46] — slow, lobs bombs at the player's position; forces constant movement [9].
17. **Skeleton Ape** [10] — throws a barrel the moment you are in range; careful advance [9].
18. **Bone Archer** [10] — advances, then an arrow that covers the screen; kill fast or approach by jumping. High perch [9].
19. **Blood Skeleton** [9] — collapses, reassembles seconds later. On a narrow path: hit and run [18].
20. **Winged Guard** [15] — enters from the sides in vertical shafts, bobbing unevenly. Stairs and climbs [18].
21. **Raven** [15] — perched; spreads wings when approached, then swoops or relocates [18].
22. **Slime** [32] — bounces between floor and wall/ceiling; demands careful movement [9].
23. **Roller (Buer)** — rolls fast along the floor, drops off ledges and keeps going. Tiered rooms [9].
24. **Mimic** — a chest that leaps when approached; one per area at most [9][SYN].
25. **Tank + gunline** — Armor Lord [81] in front, Bone Muskets [24] firing from behind. Set-piece corridor with a reward behind it [34].
26. **Thornweed** [12] — springs from the floor just before you step on it; garden paths [18].

## E. Combat feel & pacing

- E1. Hit-stop on every connecting hit: it sells contact and gives the eye frames to confirm it; without it hits feel weak and are harder to read. Add a hit spark at the contact point [27].
- E2. Scale by strength: Dead Cells criticals freeze 1 frame, then a few tenths of a second of slow-motion, plus blood and a dedicated sound; SF2 freezes about 10 frames [20][27]. Start: light 2–3 frames, heavy 5–7, kill/crit 8–10 [SYN].
- E3. Weapon weight comes from timing: a pause at the top of the backswing, or 1–2 extra frames (≈0.2 s) on the impact effect, makes a weapon feel heavy [20].
- E4. Every attack = startup / active / recovery. Fast, short-range moves recover quickly; long-range or heavy moves have longer startup and recovery [28].
- E5. Pushback on every hit prevents infinite stun-locks; each chain hit needs more hitstun than the next hit's startup, but not enough to loop back to hit 1 [28].
- E6. Large enemies that are not staggered must still visibly react (flash, jiggle) or the player feels ineffective [29].
- E7. Telegraphs: wind-up visible before the hitbox exists (Bone Pillar head glows before firing [35]); an enemy must be seen before it can hit [13]. Minimum 0.3–0.5 s for common enemies [SYN].
- E8. Forgiveness windows: coyote time, jump buffering, half gravity at jump apex, corner correction, generous ledge/wall detection [17]. SotN keeps ground properties for 7 frames after leaving a ledge [11].
- E9. Knockback: direction from the hitbox position; a single hit of ≥50% HP launches the character across the room — a rare, dramatic event [11].
- E10. SotN speeds: walk 1.5 px/frame (≈2.8 s per 256 px screen), uphill about one third slower, top movement abilities 5–9 px/frame [11]. Late-game traversal 3–6× walk [SYN].
- E11. Invulnerability after a hit: no figure in the sources; start at 1.0 s with flicker [SYN].
- E12. Each weapon needs its own verb, not only numbers (dagger: weak in front, critical from behind; sword: always crits under 50% HP) [20].
- E13. Controls come first: a good idea does not survive bad controls [19].

## F. Balance & progression

- F1. Save/checkpoint about one per area and never more than 7 screens apart [3]. One late area may have none to raise tension (SotN Clock Tower) [34].
- F2. Put health at checkpoints, slightly hidden; add health to relieve tension, remove it to make the player careful. Mini-bosses drop health [14].
- F3. Levels and gear exist so that less skilled players finish and so that old rooms become quick on the way back [7][36]. Keep the level curve such that grinding is never required [7].
- F4. Alternative: weaken an area's enemies once its boss is dead [7].
- F5. Boss rule: its designer must beat it without taking a hit using the weakest weapon; anything that fails is an unfair attack and is cut [21][22].
- F6. The area teaches its boss: the boss's hazards appear in the rooms before it [12].
- F7. Boss HP ≈ 10–20× a common enemy of that area (SotN: 200 vs 9–24 early; 500–800 vs 20–90 mid) [33].
- F8. We always build it too hard; plan a nerf pass per area and remove difficulty spikes that end runs [14].
- F9. Reward exploration with *unique* things (a one-off enemy, a new vendor, a sight), not 500 identical pickups [23]. If the world is too big to hold in the head, cut an area [23].
- F10. Tell the player where they are: distinct area themes, a landmark at key points, map and status screens, fast travel [37].
- F11. Open with a taste of full power, then take it away (SotN's first corridor) [39].
- F12. Test with speedrunners for sequence breaks [31].

## Sources

READ IN FULL
1. Itay Keren — Scroll Back: The Theory and Practice of Cameras in Side-Scrollers — https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers
2. Ario Barzan — Economy and Thematic Structure: Symphony of the Night's Level Design — https://www.gamedeveloper.com/design/economy-and-thematic-structure-symphony-of-the-night-s-level-design
3. How Blasphemous' level design iterates on classic Metroidvanias — https://www.gamedeveloper.com/design/how-i-blasphemous-i-level-design-iterates-on-classic-metroidvanias
4. Art Design Deep Dive: Giving back colors to cryptic worlds in Dead Cells — https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-
5. Celia Wagar — Good Enemy Placement — https://critpoints.net/2018/02/18/good-enemy-placement/
6. Celia Wagar — What makes an enemy well designed? — https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/
7. Celia Wagar — The Appeal of Post-SOTN Castlevania — https://critpoints.net/2015/06/26/the-appeal-of-post-sotn-castlevania/
8. Celia Wagar — Castlevania 3 Level Design Counter-Analysis — https://critpoints.net/2016/07/25/castlevania-3-level-design-counter-analysis
9. Ben Ruiz — Enemy Study: Castlevania Dawn of Sorrow (text and hand-written notes image) — https://aztez.com/blog/2013/11/26/enemy-study-castlevania-dawn-of-sorrow/
10. Hamish Todd — The Perfect Moves of an Asshole Video Game Bad Guy — https://kotaku.com/the-perfect-moves-of-an-asshole-video-game-bad-guy-5888474
11. TASVideos — Game Resources: Symphony of the Night — https://tasvideos.org/GameResources/PSX/SymphonyOfTheNight
12. Yacht Club Games — Specter of Torment Level Design Deep Dive 1/5 — https://www.yachtclubgames.com/blog/specter-of-torment-level-design-deep-dive-1-5
13. — 2/5 — https://www.yachtclubgames.com/blog/specter-of-torment-level-design-deep-dive-2-5
14. — 3/5 — https://www.yachtclubgames.com/blog/specter-of-torment-level-design-deep-dive-3-5
15. — 4/5 — https://www.yachtclubgames.com/blog/specter-of-torment-level-design-deep-dive-4-5
16. — 5/5 — https://www.yachtclubgames.com/blog/specter-of-torment-level-design-deep-dive-5-of-5
17. Maddy Thorson — Celeste & Forgiveness — https://maddymakesgames.com/articles/celeste_and_forgiveness/
18. The Castlevania Dungeon (HG101 backup) — Enemies — https://www.hardcoregaming101.net/cvbackup/enemy.htm
19. Castlevania's Koji Igarashi offers advice to today's Metroidvania devs — https://www.gamedeveloper.com/design/-i-castlevania-i-s-koji-igarashi-offers-advice-to-today-s-metroidvania-devs
20. Designing each of the 50 weapons in Dead Cells to feel distinctive — https://www.gamedeveloper.com/design/designing-each-of-the-50-weapons-in-i-dead-cells-i-to-feel-distinctive
21. A Bloodstained Q&A with Koji 'Iga' Igarashi — https://www.gamedeveloper.com/business/a-i-bloodstained-i-q-a-with-koji-iga-igarashi
22. Bloodstained's Designers Had To Prove Bosses Could Be Beaten With Only A Dagger — https://kotaku.com/bloodstaineds-designers-had-to-prove-bosses-could-be-be-1836667028
23. How to design a great Metroidvania map (Team Cherry interview) — https://www.pcgamer.com/how-to-design-a-great-metroidvania-map/
24. How the Hollow Knight devs mapped out their 'Metroidvania' — https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-
25. Hollow Knight: Silksong's Game World Isn't Actually 2D — https://80.lv/articles/hollow-knight-silksong-s-game-world-isn-t-actually-2d
26. Bringing Hollow Knight's Mood Into UE4 — https://80.lv/articles/bringing-hollow-knights-mood-into-ue4
27. Celia Wagar — Hitstop/Hitfreeze/Hitlag/Hitpause — https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/
28. Celia Wagar — Frame Data Patterns that ALL Game Designers Should Know — https://critpoints.net/2023/02/20/frame-data-patterns-that-game-designers-should-know/
29. Celia Wagar — How Do Games Make Characters Touch the Game World? — https://critpoints.net/2026/04/21/how-do-games-make-characters-touch-the-game-world/
30. Koji Igarashi talks Bloodstained's graphical overhaul — https://www.pcgamer.com/koji-igarashi-talks-bloodstaineds-graphical-overhaul-and-how-development-compared-to-castlevania/
31. Q&A: Designing the gorgeous metroidvania Ori and the Will of the Wisps — https://www.gamedeveloper.com/design/q-a-designing-the-gorgeous-metroidvania-i-ori-and-the-will-of-the-wisps-i-
32. The Makers Of Hollow Knight Are Fine With Players Missing Things — https://kotaku.com/the-makers-of-hollow-knight-are-fine-with-players-missi-1828721254
33. Castlevania Wiki — Symphony of the Night Enemy Data (full table, 147 entries; HP column used) — https://castlevania.fandom.com/wiki/Template:Symphony_of_the_Night_Enemy_Data
34. Castlevania Wiki — area pages: Marble Gallery, Outer Wall, Long Library, Clock Tower (SotN), Royal Chapel, Alchemy Laboratory (SotN), Colosseum, Olrox's Quarters — https://castlevania.fandom.com/wiki/Royal_Chapel (and sibling pages; prose is short, pages are mostly galleries)

PARTIAL
35. Castlevania Wiki — enemy pages: Axe Armor, Bone Pillar, Spear Guard, Bloody Zombie, Flea Man, Skeleton, Medusa Head, Bone Scimitar (overview paragraphs only) — https://castlevania.fandom.com/wiki/Axe_Armor
36. Wikipedia — Castlevania: Symphony of the Night (Gameplay and Development sections) — https://en.wikipedia.org/wiki/Castlevania:_Symphony_of_the_Night
37. Wikipedia — Metroidvania (lead, history, gameplay concepts) — https://en.wikipedia.org/wiki/Metroidvania
38. Celia Wagar — Kinaesthetics/Game Feel (read, not cited; end of page cut off) — https://critpoints.net/2015/04/07/kinaestheticsgame-feel/
39. The Castlevania Game That Changed Everything (opening half) — https://kotaku.com/the-castlevania-game-that-changed-everything-1821969215

NOT REACHABLE (not used): gamedev.net "Build a Bad Guy Workshop" (connection reset), gbstudiocentral.com (empty reply), hollowknight.wiki (403), hardcoregaming101.net/cvbackup/sotn.htm (404), castlevaniacrypt.com, shmuplations.com. Fandom HTML pages return a bot challenge; their wikitext was read through the site's api.php instead.
