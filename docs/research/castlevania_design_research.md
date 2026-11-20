# Vesperwrithe - Castlevania Lineage Design Research

Reference for an original 2.5D metroidvania: 3D models on a 2D gameplay plane, Diablo-2-style loot with socketable gems, one large non-linear ability-gated castle.

Compiled 2026-11-19. Confidence tags used throughout:
- **[S]** sourced from a fetched page or search result (URLs in section 12)
- **[M]** from general knowledge / memory, not re-verified this session
- **[E]** an estimate or derived number; treat as a starting value to playtest, not fact

Numbers for SotN come from the community speedrun / TAS wikis, which state speeds in pixels per frame (PPF). Those pages did not publish gravity, jump height, or i-frame counts, so those are marked [E] or "unknown".

---

## 0. TL;DR - The 12 rules that matter most

1. Responsiveness first. Igarashi's own advice: the control feel is how the player experiences every idea you have. Tune movement before content. [S]
2. SotN is not a precision platformer. Walk is slow (1.5 PPF), the jump is a fixed-ish arc, and the real mobility comes from unlocked abilities (double jump, backdash, wolf, bat, mist). Gate mobility, not basic control quality. [S]
3. Your mobility ladder should be the map's skeleton: every ability opens at least two already-seen locked spots. [S: one author's heuristic]
4. Build shortcuts that open from one side. They are the main antidote to the "backtracking is tedious" complaint, and the newest Castlevania was criticized for exactly this (long retrace after death). [S]
5. Use negative space. SotN's map is roughly half empty; Dawn of Sorrow packs the grid and reads as cramped. Give big rooms room to breathe. [S]
6. 2.5D works when the gameplay plane is rigorously flat and legible. Lighting is what rescued Bloodstained's look; hand-placed lighting per room beat auto-lighting. [S]
7. Bloodstained and Belmont's Curse both show: 3D art on a 2D plane is a lighting and readability problem, not a modeling problem.
8. Randomized drop-based power systems (Souls, Glyphs, Shards) are loved for variety and hated for grinding. Keep drop rates visible and bad-luck-protected. [S]
9. Combat options must matter. Belmont's Curse reviewers could stick with one weapon and one spell; equal-power options make choice meaningless. [S]
10. Gems should be a build-defining layer, not a flat stat bump: use D2's two-axis design (socket type x gem type) and exact-socket-count recipes (runewords). [S/M]
11. Death penalty is a map-design problem: save room placement near bosses and boss-door respawn options are cheap fixes. [S]
12. Save-room / warp-room network is a core pillar, not an afterthought. [M]

---

## 1. Newest Castlevania-lineage game: Castlevania: Belmont's Curse (2026)

### 1.1 Facts [S]
- Released 15 Oct 2026 (PS5, Xbox Series, PC; Konami's EU release page lists Switch at launch, other sources said Switch later - verify before citing).
- Developed by Evil Empire with advisory support from Motion Twin (the Dead Cells team). Announced Feb 2026 at a PlayStation State of Play; 40th-anniversary year of the series.
- 2D exploration action game, presented with 3D polygonal characters and environments styled to look hand-drawn, side-scrolling presentation.
- Pre-launch Famitsu score 32/40, described as tough. Review scores seen: VGC 3/5, GamingTrend 80, NWR 7.5; Shacknews and RPGFan very positive; GamingBolt underwhelmed as a metroidvania.

### 1.2 Key mechanics [S, via VGC review]
- Starting sword; unlockable lance, dual swords, the series whip, and leather fist wraps. Each is distinct in feel.
- About 15 "Arcanas" (magic) dropped by notable enemies. Reviewer leaned on one (Holy Cross) - switching felt optional.
- Traversal: grapple whip, and a button-hold toggle for certain blocks, driving platforming segments.
- Classic metroidvania structure: bosses grant abilities that open gated areas of a large interconnected map.
- Death returns you to the last save room, which can be far from the boss.
- Difficulty options: sliders for damage dealt/received and XP gain, extra healing potions, boss-door respawns, prevent-death mode.
- Camera: outdoor walkways use a pull-back camera to reveal detailed backdrops, then return to the gameplay framing.

### 1.3 What worked [S]
- Striking art direction, especially pull-back vista shots.
- Platforming sections that exercise new abilities.
- Wide difficulty modifier menu.
- Strong soundtrack mixing new and re-arranged themes.

### 1.4 What critics disliked [S]
- "Safe" / conventional design in a crowded genre.
- Combat variety not essential; the best weapon and spell dominate.
- Default boss difficulty frustrating; long walk from save to boss.
- Map exploration reads as ticking off uncovered areas rather than discovery.

### 1.5 Steal this for Vesperwrithe
- Ship a difficulty-modifier menu (damage dealt/taken, XP, boss-door respawn, assist). Cheap, high goodwill.
- Boss-door respawn or a save room adjacent to every boss. Never make the post-death walk more than ~30-45 seconds. [E]
- Use the pull-back / reveal camera as a rare, authored beat (once per area at most) so the vista lands.
- Make weapon classes mechanically different in a way that rewards switching (range, armor-break, elemental slot count) - not only stat deltas.
- Differentiate via the gem/loot layer: that is where Vesperwrithe can avoid the "by the book" criticism.

---

## 2. Bloodstained: Ritual of the Night (2019) - the 2.5D-with-3D-models reference

### 2.1 Facts [S unless noted]
- Igarashi's spiritual successor; built in Unreal Engine 4 (confirmed by Epic's developer interviews). Developers: ArtPlay with DICO; Inti Creates left mid-way; WayForward supplied better 3D models later.
- Igarashi chose 2.5D to follow Dracula X Chronicles / Mirror of Fate style 3D-on-2D precedent.
- Early builds were criticized as bland ("looks like poop" headlines). The team did a major visual overhaul in 2018-19.
- The bulk of the overhaul was lighting: it was initially largely automated, then lighting was hand-placed per room; textures, backgrounds, and models were also improved.
- Critics at release: backgrounds/levels still look somewhat empty; some Japanese fans preferred the original look.
- Gameplay: shards (enemy-dropped powers, one equipped per category), full crafting/cooking, nearly every weapon/power upgradable. GameSpot: shard system is more robust than SotN's spells/relics/familiars. Also noted: game is rarely challenging because of shards and power-ups. Some reviewers say shards carry Aria's randomness problems; movement shards get annoying when needed for specific obstacles.
- Boss rule (Kotaku/PC Gamer): designers had to beat each boss without taking a hit to prove it was fair. [S]

### 2.2 What worked
- 3D models allow dynamic lighting, normal-mapped armor reflections, cheap animation blending, and equipment visibly changing on the character.
- Per-room hand-lit atmosphere rescued the look.
- Shards give build variety and tie into exploration (movement shards = gates).

### 2.3 What went wrong
- Flat/auto lighting makes a 3D-on-2D scene look like a plastic diorama.
- Empty-looking levels: foreground/midground dressing sparse.
- Systems stacking (shards x crafting x gear) made the game easy.

### 2.4 Steal this
- Budget lighting art time as a first-class production task: one hand-lit pass per room, key + rim + fill + local practical lights. Plan ~25% of environment art time for lighting. [E]
- Visible equipment on the character model is a free payoff for a loot-driven game; build the rig with socket/attachment points from day one.
- Boss fairness test: the designer must beat every boss no-hit before it ships.
- Keep movement abilities as unique items (relics) not rolled-randomly shards, to avoid "I need that exact drop" gating.

---

## 3. 3D-on-2D lineage notes (Dracula X Chronicles, Mirror of Fate) [S, thin]

- Lords of Shadow: Mirror of Fate (3DS 2013): characters move on a 2D plane in 3D environments; camera pulls out during platforming/puzzles and moves low and close during fights. NWR called it a confident interpretation; GamesBeat said it marries two unwilling elements; Destructoid: promised fusion never fully arrived. The recurring complaint: combat/platforming designed for 3D then squeezed into 2D. [S]
- Dracula X Chronicles (PSP 2007): 3D models with 2D movement. One unreliable essay notes that 3D models can make hitbox reading harder. Treat as a hypothesis to guard against, not a fact. [S, weak]
- Lesson: design in 2D first (gameplay plane, hitboxes in 2D), then dress in 3D. Do not design combat with depth in mind.

---

## 4. Castlevania: Symphony of the Night (PS1, 1997)

### 4.1 Structure
- Igarashi was assistant director; it began as a side story, which freed the team to break franchise conventions. [S]
- Reintroduced exploration, nonlinear level design, and RPG elements. [S]
- Main castle plus Inverted Castle (the full map flipped upside-down). GamesRadar reports the map was deliberately designed to work equally well right-side-up and inverted. Critics split: brilliant reveal vs. lazy reuse; inverted half has little ability gating. [S]
- Relics (Soul of Bat, Wolf, Mist, Leap Stone, Gravity Boots, Jewel of Open, etc.) are the main gating system; some map regions do not show until a relic is obtained. [S/M]
- Nearly half of the map grid is empty space by design; areas have breathing room and are easy to mentally map. Smaller rooms cluster around large primary spaces. Later handheld games split and shrank rooms, and the Dawn of Sorrow map packs space. [S]
- Area themes are built into layout (Chapel: tall towers and a long staircase building anticipation; Colosseum and Catacombs: compression). [S]

### 4.2 Key mechanics [M unless tagged]
- Equipment: two hand slots + head, body, cloak, two accessories. Equipment screen with a stat preview that shows change in ATK/DEF/STR/CON/INT/LCK on hover. Two-handing, shields as a weapon, shield rod, and item-use quirks.
- Spells via d-pad+button commands (fireball, summons), familiars (level up, become an extra "party member"), subweapons with hearts.
- Level-up by XP, HP/MP growth; four stats only matter via equipment synergies.
- Transformations: Bat, Wolf, Mist, plus the Dark Metamorphosis spell.
- Save rooms with healing; Teleporters/warp rooms (five points, unlocked as you find them; the Warp Room network lets you skip travel, but fast-travel spots are gated by discovery). Library shopkeeper (Librarian) as fixed-point shop.
- Map auto-revealed as you walk; red = save, blue = warp (color scheme [M]).
- Castle gating is soft: SotN rarely locks you in; many areas can be entered early by skill, with no hard lock until the relic. [S, Steam discussion]

### 4.3 Movement tuning (see section 7 for consolidated table)
Verified numbers [S: castlevaniaspeedruns.com and TASVideos]:
- Walk / jump-forward horizontal: 1.5 PPF. Wolf walk: 1.0. Axe Armor run: 2.5.
- Backdash top speed: 3.5 PPF.
- Jump top vertical (initial upward speed): 4.9 PPF. Double jump top: 4.1 PPF.
- Terminal fall speed and divekick: 7.0 PPF (divekick top also quoted at 4.5 horizontally).
- Wolf dash top: 3.0; Skill of Wolf top: 5.0; Power of Wolf top: 9.0.
- Gravity Boots: 12.0 PPF up (capped to 4.0 under scroll lock).
- Wing Smash: 6.0 PPF horizontal, 63 total frames, all 63 invincible, 8 MP.
- Big Toss (thrown item): 8.0.
- Bat flying 1.3 forward axis; Mist 0.5.
- Richter: run 2.3, jump top 5.8 up, backflip 1.5 horizontal / 4.5 up, slide 5.8 top.
- Landing stun: 10 frames after walking off a ~128px ledge, 33 frames after a jump or fall untransformed from that height; cancelable by jumping or tapping shield. (A distinctive SotN feel: a heavy landing.)
- 7-frame ground-to-air window where you can still walk and jump (coyote time).
- Running off a ledge: half horizontal speed until landing.
- Uphill / underwater: slightly under 1/3 horizontal speed penalty, stacking.
- Large hit (lose >= half HP): launched at high speed until hitting a wall/ceiling, sticks to the wall about a second.
- Running and backdash animations shrink the vertical hitbox (low profile, a deliberate dodge).
- Shield/item pull can chain backdashes ("shield dash"), a skill-expression exploit.
- Contact-damage knockback direction follows the enemy's last movement; attack-hit direction follows hitbox position.
- Room transitions trigger from the gap between camera X and player X.

Unknown / not found: exact gravity constant, jump apex height in px, backdash duration in frames, i-frame count after a normal hit, attack startup/active frames of the standard sword. Practical SotN impressions [M]: no variable jump height on the first jump in the sense of Mario; the jump height is largely fixed, and the double jump adds a second, lower hop. Attack while moving: you can attack while walking in the air; on the ground the attack plants you (can't move during most attacks). Turning on the ground is instantaneous. Crouching blocks movement and lets you attack low. After being hit there's a short invulnerable flicker (~1 sec [E]).

### 4.4 What worked
- Large readable castle with distinct themed areas and constant secret hooks (false ending, inverted castle).
- Tons of weapon/spell/armor variety with build identity (Shield Rod + Alucard Shield, dual-wield, Crissaegrim).
- Familiars and transformations as playstyle toys.
- Save/warp rooms keep exploration safe.

### 4.5 What critics disliked
- Inverted castle feels like reuse and lacks gating.
- Balance breaks early (Crissaegrim, Shield Rod + Alucard Shield makes the game trivial). [M]
- Movement "slow and clunky" to modern players (Giant Bomb forum title surfaced) and heavy landing recovery. [S]
- Menus: a lot of tapping through equipment screens. [M]

### 4.6 Steal this
- Make the physical cost of movement visible: slow-ish base walk, then mobility upgrades that feel like big power boosts.
- Landing stun is a risk/reward knob; use it for heavy armor classes, with cancel windows.
- 7-frame coyote window on every ledge leave. Use 6-8 frames at 60fps. [S]
- Different movement forms are "keys" (Bat flies, Mist squeezes through grates, Wolf runs). Vesperwrithe can express the same with equipment sockets.
- Half-empty map grid; big set-piece rooms.
- Ship a stat-preview equipment screen with comparison arrows and color coding.

---

## 5. GBA era

### 5.1 Circle of the Moon (2001) - DSS card system
**Mechanics [S/M]:** Dual Set-up System: pair an Action card (Mercury, Venus, Jupiter, ...) with an Attribute card (Salamander, Serpent, ...), 10 x 10 giving 80+ distinct spell effects (critic aggregator figure: over 80). Cards drop randomly; DSS cards are the player's main combat option beyond whip and subweapons. Also a "magic items" system (items gating abilities).
**Worked:** Combinatorial depth from small parts; every card pair feels like a new item.
**Disliked:** Obstacle-course platforming; presentation of the system is clunky; a glitch allows the entire card pool after one valid pair. [S, blog reviews] The game was seen as grafting older Castlevania sensibilities on SotN's structure. Dark, brown visuals and muddy GBA screen. [M]
**Steal:** 2 x N pairing as the model for gem combos (see section 9). Make combos legible with a preview.

### 5.2 Harmony of Dissonance (2002)
**Mechanics [M/S]:** Two castles (switchable "dual map"), book-spell system (spell books combined with subweapons; spells cast by combining book with sub-weapon). More SotN-like movement, brighter colors.
**Worked:** Dropped obstacle-course layouts; fun. [S: Backloggd reviewer]
**Disliked:** Repetitive rooms, controversial castle design, small cramped rooms, garish color. [S/M] Article note: Chapel of a Heretic stair setup lacks SotN's payoff. [S]
**Steal:** Dual-state world (castle A/B) can be done as a sparse "twin-world" toggle for key areas rather than whole-map duplication. Avoid repeating identical rooms.

### 5.3 Aria of Sorrow (2003) - Tactical Soul system
**Mechanics [S]:** Souls dropped at random by enemies; categories Bullet (active spell), Guardian (lasting effect / summon), Enchanted (passive), Ability (traversal) - 100+ souls, four categories. Souls are equipped to slots; each enemy has a rare soul drop. Soma can swap weapons and armor.
**Worked:** Even a single enemy in a dead-end room feels worth killing; Mega Man-style absorption "taken to the logical limit" without forcing engagement; great variety per playthrough. [S]
**Disliked:** Random drops can be tedious, grinding for particular soul. [S]
**Steal:** Make every enemy type worth fighting once: first kill gives a low-rate unique; a "bestiary pity counter" raises the chance after N kills. Show drop-rate to the player. Absorbed powers as a secondary system to gems (see 9.4).

---

## 6. Nintendo DS era

### 6.1 Dawn of Sorrow (2005)
**Mechanics [S]:** Soul system retained, but identical-soul stacking can power up that soul; souls also used for weapon crafting (Soul-trade). Touch-screen "Magic Seals" to finish bosses. Julius Mode as a bonus, praised for simplicity.
**Worked:** Souls more varied than Aria's; duplicates power effects. [S]
**Disliked:** Seal minigame felt shoehorned to use the touch screen. Soul drop rates very stingy; crafting forces grinding for rare souls. Map packs the grid, smaller rooms. [S]
**Steal:** Duplicates improving an effect gives a reason to keep farming but with a ceiling. Never use gimmick input for core power.

### 6.2 Portrait of Ruin (2006)
**Mechanics [S]:** Two protagonists with a partner system (one on-field, other swappable/assist), paintings as separate themed worlds, return of subweapon-style "relic" dual crush. Reviewers: ambitious, underused, partner swapping is "sometimes clumsy." Great Stairway repeated near-identical chambers read as padding. [S]
**Steal:** Portrait-style sub-worlds as hubs off the main castle: each can reuse the same engine but have a unique palette and rule (gravity, darkness). Don't pad with duplicate rooms.

### 6.3 Order of Ecclesia (2008) - Glyphs
**Mechanics [S]:** Shanoa absorbs glyphs from enemies and glyph statues; two hand slots (left/right) for attack glyphs + a separate slot for passive glyphs; combining two glyphs yields a union attack; MP drain on use, refills when you stop attacking. Favorable Metacritic; harsh difficulty is the most common complaint.
**Worked:** Deliberate acquisition: most enemies don't drop glyphs, and it's clear which do; unions are a mini-game for finding the best combo; deeper versatility than Dawn of Sorrow. [S]
**Disliked:** Not much new vs soul system; difficulty. [S]
**Steal:** Left-hand/right-hand slotting plus union combos is the clearest template for socket-pair synergies. Make drops legible: telegraph which enemies carry gems.

---

## 7. Movement tuning table

### 7.1 SotN verified numbers (pixels per frame, 60 Hz logic; native screen ~256x240) [S]

| Action | Value | Notes |
|---|---|---|
| Alucard walk / forward-jump horizontal | 1.5 PPF (~90 px/s at 60 fps) | Same speed on ground and in air |
| Wolf walk | 1.0 | |
| Axe Armor run | 2.5 | Run is equipment-specific |
| Backdash top | 3.5 | Low-profile hitbox during the dash |
| Jump top vertical speed | 4.9 up | |
| Double jump top vertical | 4.1 up | Lower than first jump |
| Fall / divekick terminal | 7.0 down | Same cap |
| Divekick horizontal top | 4.5 | |
| Wolf dash | 3.0 | |
| Skill of Wolf / Power of Wolf | 5.0 / 9.0 | |
| Gravity Boots | 12.0 up (4.0 under scroll lock) | 44 frames, 0 i-frames, 4 MP |
| Wing Smash | 6.0 horiz; 63 frames, 63 i-frames; 8 MP | |
| Bat | 1.3 (forward axis); 0.8 diagonal | |
| Mist | 0.5 | Power of Mist 1.0 |
| Richter run / jump up | 2.3 / 5.8 | Backflip 1.5 horiz, 4.5 up |
| Coyote window | 7 frames | Walk + jump still allowed after leaving ground |
| Ledge run-off | half speed until landing | |
| Landing stun | 10 f (short drop) / 33 f (high drop or jump from ~128 px) | Cancel by jump/shield |
| Slope / water | ~ -1/3 horizontal | Stacks |
| Heavy-hit launch | When >= 50% HP lost in a hit | Wall stick ~1 s |

### 7.2 Derived/estimated physics model (for Vesperwrithe) [E]

Do not treat as SotN facts. Use ratios relative to character height H (Alucard ~ 48-56 px on 240 px screen, so H ~ 1/4.5 of screen height).

| Parameter | SotN-inspired value | Vesperwrithe target (world units, H = 1.8 m) |
|---|---|---|
| Walk speed | 1.5 PPF -> ~0.6 H/s at 56 px | 2.2-3.0 m/s (readable, slightly slow) |
| Run (unlockable / armor) | 2.5 PPF -> ~1.0 H/s | 4.5-5.5 m/s |
| Backdash | 3.5 PPF for ~12-16 f [E] | 6-7 m/s for 0.22-0.28 s, ~1.5 m distance, i-frames first 6 f |
| Jump apex | ~3.5-4 H [E] (SotN jump clears most platform gaps with ease) | 2.2-2.8 m; hold-to-extend window up to ~0.25 s (variable height) |
| Time to apex | ~0.5 s [E] | 0.42-0.5 s |
| Gravity | terminal 7 PPF ~ 420 px/s ~ 7.5 H/s | Fall gravity ~1.6-1.8x rise gravity for snappiness; terminal ~ 14-16 m/s |
| Double jump | 4.1/4.9 = ~84% of first jump speed ~ 70% height | 70% of first apex |
| Coyote time | 7 f | 0.1-0.12 s |
| Jump buffer | not documented | 0.1 s |
| Landing recovery | 10 f (small) / 33 f (large) | 0 for normal; 10 f after fall > 4 m; cancelable by jump/dodge |
| Air control | full horizontal speed in air (fixed 1.5) | Full control, 0.9x ground accel |
| Attack in air | allowed; movement continues | Allowed; keep momentum |
| Attack on ground | planted for most attacks | Light attacks allow 30% move speed; heavy plant |
| Crouch | blocks movement, low attack, shrinks hitbox | Crouch + slide as unlock |
| Turn | instant | Instant for ground; 2-frame animation blend, no logic delay |
| Hit stun | short, flicker i-frames ~1 s [E] | 0.5-0.6 s stun, 1.0 s i-frames after recovering control |
| Knockback | direction by enemy movement / hitbox | Direction from attacker center, 1.2-2 m horizontal, 0.4 m pop |
| Big-hit launch | >= 50% HP | Optional "stagger launch" on huge hits; wall-stick as juice |

Rules of thumb:
- Define everything in meters and seconds; derive frames at the physics tick (use fixed 60 or 120 Hz).
- Variable jump: SotN's jump is mostly fixed. Adding a short cut-off (release early reduces apex to ~60%) is the main modernization players expect; keep it subtle.
- Commit-vs-cancel: SotN commits you to attacks; modern players expect cancel windows. Allow jump/dash cancel on recovery only.
- Shield/item dash exploits (momentum cancel) became beloved speedrun tech; leave small seams intentionally (e.g., backdash-cancel into dash).

### 7.3 Feel checklist
- Input latency: aim < 3 frames input-to-action. Never let animation blend delay logic.
- Provide input buffering for attack and jump (6 frames).
- Camera follows with a dead zone and look-ahead, not rigidly locked (section 8).
- Test one-room "gym" with ledges, pits, spikes, slope, ladder, and a knockback dummy before any content.

---

## 8. Camera and 2.5D rendering guidelines

### 8.1 Principles (from Bloodstained, Belmont's Curse, Mirror of Fate)
1. Gameplay plane is fixed: the player, enemies, projectiles, and hitboxes live at Z = 0. Colliders are 2D (or 3D with Z locked and depth thin). Treat the model as a skin only. [S: hitbox legibility concerns]
2. Camera is a side-on perspective camera with a narrow-to-moderate FOV (25-40 deg), pulled back far enough that parallax and depth read but the plane stays clear. Orthographic gives flat 2D legibility but loses lighting depth; a long-lens perspective is the usual compromise. [M/E]
3. Layers: far background (skybox / matte), mid-background (architecture with true 3D parallax), gameplay layer, foreground (dressing and occluders at low opacity or with silhouettes). Each layer has a distinct value range so the player layer pops.
4. Silhouette first: player, enemies, and hazards must read in a thumbnail. Rim lights on characters, darker/desaturated backgrounds, saturated hazards.
5. Authored camera events (pull-back reveal, tilt for tall rooms) are rare set pieces [S: Belmont's Curse] and use ease-in/out; never during combat.
6. Room-based camera bounds with soft zones; smooth interpolation on transitions; scroll rooms vs. static rooms mix for pacing (SotN uses both).
7. Depth cues: fog, volumetric god-rays, particles drifting at multiple depths. Use cheaply.
8. Lighting is the art direction [S: Bloodstained overhaul]: hand-placed key/rim/fill per room, baked GI where possible, a small number of dynamic lights for gems/spells so socketed elemental effects visibly light the scene (fire gem = flickering orange rim on the player and nearby walls).
9. Avoid "plastic diorama" look: add decals, grime, normal-mapped stone, props overlapping at multiple depths, atmospheric haze.
10. Performance budget: 2.5D games may render big environments; instance modular kits, bake lightmaps, keep dynamic shadows to 1-2 casters.
11. Hurtbox/hitbox should be simple capsules/boxes independent of animation; mesh may swing outside them for style (Belmont-style whip arcs).
12. Cutscenes/vistas may break the plane; gameplay may not.

### 8.2 Tech notes for Vesperwrithe [M/E]
- Godot, Unity, or Unreal all work; if Unreal, use Paper-style plane-locked movement with a SpringArm-free fixed camera rail.
- Use a custom camera rig: target = player position + facing look-ahead (0.8 m), vertical bias upward when grounded, dead zone 0.6 x 0.4 m, smoothing 0.15-0.25 s, room bounds clamp, per-room override (FOV, distance, tilt 0-8 deg).
- Cel-shaded or painterly shading eases readability (PC Gamer reports the Bloodstained prequel leaned further into cel-shaded 3D; Belmont's Curse uses hand-drawn-look 3D). [S]
- Materials: toon ramp with 3 bands plus rim light; outline via inverted-hull or post-process; avoid highly specular PBR on the player that fights the background.
- Z-order of effects: attack VFX placed at Z slightly toward camera so they never sink into walls.
- Keep animation 2D-friendly: strong key poses, anticipation visible from the side, exaggerated lateral swing, ensure silhouettes don't collapse when the character faces away from camera.

---

## 9. Itemization, gems, and sockets (SotN + soul/glyph systems + Diablo 2)

### 9.1 What Diablo 2 teaches [S/M]
- Socket count is the base item's trait; sockets are added late (Horadric Cube recipes or Larzuk's quest). Max sockets vary by base type.
- Runewords: a specific rune sequence inserted in order into a normal (white/grey) item with exactly the required socket count and allowed base type creates a named item with unique bonuses. Magic/rare/unique/set/crafted bases don't qualify. [S]
- Rune/gem effects differ by slot type: weapon, armor, shield (and helm) give different bonuses for the same gem. [S/M]
- Gems have grades (chipped, flawed, normal, flawless, perfect) and types (topaz, amethyst, sapphire, ruby, emerald, diamond, skull) with distinct per-slot effects (e.g., topaz = lightning damage in weapon / MF or mana in armor). [M]
- Why it works: sockets turn every base item into a potential build piece; runewords give late-game "recipe discovery" and chase goals; the exact-count rule prevents multi-runeword stacking. [S]

### 9.2 Proposed Vesperwrithe gem system

**Slots**
- Each equippable has 0-4 sockets. Sockets have a type: *Weapon, Armor, Charm*? Keep to 3: **Edge** (weapons), **Ward** (armor/shield/cloak), **Sigil** (accessories). Same gem yields different effect per socket type (D2 model).
- Rarity ties to sockets: common 0-1, magic 1-2, rare 2-3, unique fixed sockets, "pale/blank" bases can take runeword-style recipes.
- Socket addition: a Gemwright NPC in the castle adds sockets with escalating cost and a random failure chance that destroys the gem, not the item.

**Gem families (elemental effects)**
| Family | Edge (weapon) | Ward (armor) | Sigil (accessory) |
|---|---|---|---|
| Ember (fire) | burn DoT, ignites oil | fire resist, thorns burn | +fire spell power |
| Rime (ice) | slow on hit, freeze buildup | cold resist, frost aura | MP regen |
| Storm (lightning) | chain arc to nearest enemy | shock resist, stagger resist | attack speed |
| Venom (poison) | stacking poison | poison resist, cleanse | life regen |
| Umbra (shadow/lifesteal) | lifesteal | life on kill | transformation duration |
| Aether (holy/arcane) | bonus vs undead, light | magic resist | MP cap |

**Grades:** 5 tiers, three of the same grade merge to next grade (D2 cube style). Tier gives numeric bonus and, at tier 4-5, a visual effect on the character model (rim light color, particles, weapon glow) - a free payoff for 3D models.

**Active abilities from gems (SotN spell + DSS + Glyph inspiration)**
- A gem in a weapon socket may grant an *active*: a bound command input (e.g., down+forward+attack) that consumes MP. Equipping two different gems in one weapon unlocks a **Union** (DSS / Ecclesia unions): fire + ice = steam burst, lightning + poison = corrosive storm. Provide a union table (6 families -> 21 pairs) with 10-12 hand-authored unions, and a generic fallback for others.
- Preview: socketing UI shows "Union available: ...".

**Runewords equivalent: "Litanies" (named recipes)**
- Specific ordered gem sequences in a plain base with exact socket count and allowed weapon class create a named item (e.g., "Vespers": Rime-Umbra-Aether in a 3-socket rapier). Recipes found via lore pages/bestiary entries (discovery payoff) and listed in the codex once discovered.
- Rule: Only blank (non-magic) bases; fixed socket count; ordered. [S: D2]
- Litanies give a unique active and a passive that regular gems can't, and may break the usual numeric ceiling.

**Absorbed powers (Aria/Ecclesia lineage)**
- Rare enemy-drop "Wraith Marks" provide small passives or traversal modifiers, slot count small (3). Keep them separate from gems so gem build and mark build interact but don't collapse into one pool.
- Duplicate marks of the same type stack to a cap of 3 (DoS lesson [S]).

### 9.3 Loot tiers and drops
- Rarity: Common (white), Magic (blue), Rare (yellow), Unique (gold), Litany base (grey, the only runeword-eligible), Mythic (castle secrets).
- Affix pools: prefix/suffix as in D2, SotN-like "stat" tilt (STR/CON/INT/LCK) to keep stat-equipment synergy.
- Drop design: each enemy has a loot table; bosses have guaranteed gem-tier drops; secrets give uniques.
- Bad-luck protection: after N kills without the rare drop, odds ramp; always show the enemy's bestiary drop information after first kill (Aria/DoS grind complaint). [S]
- Gems as currency-lite: merge, trade at the Gemwright, break down into dust.
- Avoid "one best weapon" collapse (Belmont's Curse, SotN Crissaegrim). Give each weapon class a unique mechanic that gems amplify differently.

### 9.4 Inventory UI (SotN-inspired)
- Equipment screen mirrors SotN: slots on left, list on right, stat comparison with green/red arrows, a "Union preview" panel for gems.
- Weight/slots: no Diablo grid inventory; use a categorized list with filters (weapons/armor/gems/consumables). Faster on controller.
- Sockets shown as pips on the item; hover shows contained gems; one button "swap gem" from the same screen.
- Quick-swap loadouts (two weapon loadouts on a hotkey) to address the "switching feels optional" critique.

### 9.5 Balance guardrails
- Elemental enemies with resist/weak rotation so a single element isn't optimal; boss phases with different weaknesses.
- Cap multiplicative stacking; use diminishing returns on identical gem types.
- Provide a "respec gems free" option (unsocket costs nothing) to encourage experimentation; the D2 destruction risk applies only to socket adding.

---

## 10. Room, map, and backtracking design rules

### 10.1 Rules from the sources
1. Design the room graph and the gate list first, on paper. Each new ability should open at least two previously seen rooms/doorways. [S: one author's heuristic, treat as guideline]
2. Rooms need gates at different ability levels so a return visit has value; show hints of unreachable areas (ledges beyond reach, glowing walls, cracks). [S]
3. Shortcuts that open from one side are the main anti-tedium tool; every area should have at least one return shortcut linking to a save/warp room. [S]
4. Gates must be readable: consistent visual language for each ability gate (cracked wall = break, grate = mist, high ledge = double jump/gravity). [S: thesis on multi-form abilities]
5. Leave negative space on the map; big rooms plus small satellite rooms; avoid identical repeated chambers (Great Stairway padding). [S]
6. Give each area a spatial identity (vertical tower, compressed catacomb, wide gallery). [S]
7. SotN's gates are soft; allow skilled players to break sequence with tricks, but keep sequence-break rewards modest. [S]
8. Inverted/second-pass castles need new gates or new enemy tables to avoid "reuse" criticism. [S]
9. Avoid obstacle-course layouts (Circle of the Moon complaint) between save points. [S]
10. Death cost: save room distance and boss-door respawn (Belmont's Curse complaint). [S]

### 10.2 Concrete targets (Vesperwrithe) [E]
- Castle size: 10 zones, ~220-300 rooms, 45-60% of grid used. 12-14 hard gates, 20+ soft gates (skill tricks).
- Save rooms: one per ~12-15 rooms and always within 1-2 rooms before a boss; warp rooms: 7-9, unlocked by discovery.
- Warp network: reaching a warp room unlocks it; warp rooms connect to a hub, not point-to-point, so the player must still learn geography.
- Ability ladder (example): Dash/backdash -> Double jump -> Wall-cling/Gravity -> Mist (grate squeeze) -> Swim/Resist hazard -> Bat-flight -> Key items (Lantern for darkness; Seal for sigil doors). Each with 3+ signposted gates before it's earned.
- Map UI: auto-reveal on entry, color-coded save/warp/shop, player-placed pins, a gate-marker layer ("you saw something you can't reach yet") that auto-pins unreachable ledges and locked doors.
- Backtracking cadence: after each major ability, plan a ~15-25 minute "payoff loop" that returns to earlier zones with new enemies or gem drops. [E]
- Secrets: breakable walls, hidden rooms, and gem-socket-gated doors (a "socketed seal" door that opens when a specific gem family is equipped; ties systems to map).
- Gem-gated traversal alternative: Ember melts ice bridges, Storm powers lifts, Rime freezes water into platforms - elemental gems as soft gates alongside hard abilities, enabling the gem system to touch exploration (cf. Bloodstained shards/Aria souls with Ability category).

### 10.3 Pacing
- Opening: first save room within 90 seconds, first ability within 20-30 minutes, first boss within 40-50 minutes. [E]
- Reveal moments: one memorable twist (SotN's inverted castle) - Vesperwrithe could use an "eclipse" state where the castle's lighting and layout rules shift (e.g., doors open/close). Add new gating, not reuse. [S: critic complaints]
- Give breathing rooms after bosses (quiet room with save + loot).

---

## 11. Enemy design patterns

### 11.1 Patterns observed [S/M]
- Soul/glyph/shard-drop enemies: each enemy contributes a possible reward, making every encounter meaningful (Aria). [S]
- Telegraphed drops: in Ecclesia it's clear which enemies carry glyphs. [S]
- Bosses fairly tested: every boss must be beatable no-hit by its designers (Bloodstained). [S]
- Difficulty spikes in bosses draw complaints; difficulty sliders mitigate. [S]
- Room-tailored enemies: place an enemy where the room geometry matters (low ceiling = crawlers; open arena = flyers).

### 11.2 Archetypes for Vesperwrithe
| Archetype | Behavior | Teaches / tests |
|---|---|---|
| Walker (skeleton) | Patrol, melee swing with 0.4 s tell | Spacing, basic attack timing |
| Shielded | Blocks front; armor-break via heavy or element | Weapon choice, gem element |
| Flyer | Sine path, dive attack | Vertical aim, air control |
| Ranged / caster | Fires arcing projectile, retreats | Closing distance, dash |
| Charger | Straight-line rush after telegraph | Backdash i-frames, jump |
| Ambusher | Hidden until trigger (wall, mimic) | Awareness, map memory |
| Swarm | Many weak units | AoE gems (chain lightning) |
| Elemental hazard | Resist-gated (fire pools, ice floor) | Ward gems |
| Mini-boss | Guards ability/relic or gem | Fair intro of mechanic |
| Environmental enemy | Turret, spike wall, chandelier | Room reading |

### 11.3 Rules
- Telegraphs: 12-24 frames (0.2-0.4 s) for basic attacks, 30-45 f for heavy; sound cue plus silhouette change.
- Contact damage: SotN-style contact damage exists; keep for some enemies but not all. Knockback direction from enemy's motion vs attack hitbox. [S]
- Each enemy has: weakness, resistance, one rare gem drop, bestiary entry unlocked at 1 kill, pity counter after N kills (Aria/DoS grind lesson). [S/E]
- Boss structure: 3 phases, a damage-window cadence, "tell then punish", no unavoidable damage; the dev must no-hit it. [S]
- Optional boss gates: gem-element weakness so a build changes the fight but never invalidates it.
- Area-linked familiars/eliminations: allow SotN-style familiars as socketed "Sigil" effects (summons with level-ups).

---

## 12. Sources

Newest Castlevania:
- https://www.konami.com/games/eu/en/topics/19359/ (Belmont's Curse launch)
- https://www.gematsu.com/2026/02/castlevania-belmonts-curse-announced
- https://www.videogameschronicle.com/review/castlevania-belmonts-curse-review/
- https://gamingtrend.com/reviews/castlevania-belmonts-curse-review/
- https://www.gamesradar.com/games/action-rpg/castlevania-belmonts-curse-review/
- https://www.nintendoworldreport.com/review/77721
- https://www.gamerfuzion.com/castlevania-belmonts-curse-first-review-famitsu-32-40/
- https://www.rpgfan.com/review/castlevania-belmonts-curse/

Bloodstained / 2.5D:
- https://pcgamer.com/koji-igarashi-talks-bloodstaineds-graphical-overhaul-and-how-development-compared-to-castlevania
- https://gamesradar.com/bloodstained-art-style
- https://www.unrealengine.com/developer-interviews/famed-castlevania-producer-creates-new-igavania-hit-bloodstained-as-an-indie-developer
- https://www.pcgamer.com/bloodstaineds-designers-had-to-defeat-the-bosses-they-made-without-taking-a-hit
- https://www.shacknews.com/article/112973/bloodstained-ritual-of-the-night-review-igamania
- https://Www.Gamespot.com/reviews/bloodstained-ritual-of-the-night-review-not-dead-y/1900-6417192/
- https://metroidvaniareview.com/bloodstained-ritual-of-the-night/
- https://www.pcgamer.com/games/action/bloodstained-is-back-after-6-years-with-3d-cutscenes-that-look-like-theyre-from-a-different-era-of-videogames/
- https://www.nintendolife.com/games/3ds/castlevania_lords_of_shadow_-_mirror_of_fate/review
- https://gamesbeat.com/castlevania-mirror-of-fate-review/
- https://www.gamereactor.eu/castlevania-lords-of-shadow-mirror-of-fate-review

SotN movement and design:
- https://castlevaniaspeedruns.com/SOTN/Alucard
- https://castlevaniaspeedruns.com/SOTN
- https://tasvideos.org/GameResources/PSX/SymphonyOfTheNight
- https://kb.speeddemosarchive.com/Castlevania:_Symphony_of_the_Night/Game_Mechanics_and_Glitches
- https://castlevania.fandom.com/wiki/Back_Dash
- https://www.gamedeveloper.com/design/economy-and-thematic-structure-symphony-of-the-night-s-level-design
- https://gamedeveloper.com/design/-i-castlevania-i-s-koji-igarashi-offers-advice-to-today-s-metroidvania-devs
- https://www.gamesradar.com/au/castlevania-symphony-night-designed-upside-down
- https://en.wikipedia.org/wiki/Inverted_Castle
- https://www.rpgfan.com/review/castlevania-symphony-of-the-night-4/
- https://www.killscreen.com/impossible-architecture-castlevania-symphony-night/
- https://www.engadget.com/2015-05-09-castlevania-symphony-of-the-night-devs-play.html
- https://gamedeveloper.com/design/father-and-s-o-n-iga-talks-metroidvania-

GBA / DS:
- https://metroidvaniareview.com/castlevania-aria-of-sorrow/
- https://mofuble.neocities.org/blog/com.html
- https://criticsir.com/media/game/222410
- https://metroidvaniareview.com/castlevania-dawn-of-sorrow/
- https://www.vgmuseum.com/mrp/NewCV/rev-dos.htm
- https://gamedeveloper.com/business/critical-reception-konami-s-i-castlevania-dawn-of-sorrow-i-
- https://www.gamespot.com/reviews/castlevania-portrait-of-ruin-review/1900-6162744/
- https://www.honestgamers.com/5306/ds/castlevania-portrait-of-ruin/review.html
- https://www.rpgfan.com/review/castlevania-order-of-ecclesia/
- https://en.wikipedia.org/wiki/Castlevania:_Order_of_Ecclesia
- https://www.gamerevolution.com/review/42255-ctlvn-ecclesia-review

Diablo 2 and general metroidvania design:
- https://www.pcgamer.com/diablo-2-runewords-list-by-level
- https://purediablo.com/d2wiki/Making_Runewords
- https://www.diablobytes.com/d2-resurrected/guides/socket-guide/
- https://sorceress.games/blog/sprawl-how-to-make-a-metroidvania-map-ability-gates
- https://www.nintendolife.com/news/2021/10/soapbox-what-makes-a-game-a-good-metroidvania-anyway
- https://bugnet.io/blog/how-to-design-a-metroidvania-map

Caveats: several fetches returned 403 (Epic interview, purediablo); those claims rest on search snippets. Per-gem D2 stats and SotN equipment/save/warp details are from memory [M]. The gravity/jump-height/i-frame numbers for SotN were not found in public sources this session; section 7.2 values are estimates to be validated by frame-stepping a capture of the game.
