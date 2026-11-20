# Vesperwrithe - Metroidvania Design Research 2

Companion to `castlevania_design_research.md`. That file covers movement numbers, the Castlevania lineage overview, camera/2.5D rules, gem/socket itemization and generic map rules. This file does not repeat them. It covers: SotN area-by-area level patterns, enemy behaviour archetypes, boss mechanics, weapon specials, gating, RPG systems, Silksong, and one best idea each from four other games.

Compiled 2026-11-19. Confidence tags:
- **[S]** confirmed this session from a fetched page or search result (URLs in section 9)
- **[M]** from memory of the game, not re-verified this session (fan wikis blocked automated fetches) - spot-check before quoting as fact
- **[E]** a proposal or estimate for Vesperwrithe, not a fact about any game

All text is summarised in my own words; nothing is quoted from sources.

---

## 1. SotN - castle areas: identity and how the geometry plays

General rule from the level-design essay [S]: every area is built around one or two dramatic primary spaces with small satellite rooms; shape, compression and verticality express the theme; 14 rooms in the game are non-rectangular and 9 of those are the big primary ones; staircases are used as drama (hint, expectation, payoff), not just connectors.

| Area | Shape / identity | How it plays |
|---|---|---|
| Entrance | Long flat hall, drawbridge, underground stream below [M] | Straight-line power fantasy on entry (wargs, zombies), then Death strips your gear. Revisited later from the other side with new abilities; stream below needs later tools. |
| Alchemy Laboratory | Vertical zig-zag of small chambers [M] | First "real" level: lifts, spike pits, a cannon that blows open a shortcut wall, breakable floor/ceiling tiles, first duo boss. Enemies that walk around platform edges (spittle bones) teach you to watch ceilings. |
| Marble Gallery | Long horizontal corridors meeting at a central Clock Room [M] | The hub. Clock Room has two statues: one opens on a timer, one opens only when the Stopwatch subweapon is used. Blue door (Jewel of Open) leads down to the caverns. Floor of the clock room is the late-game door to the castle centre. Gravity Boots and Spirit Orb here [S]. |
| Outer Wall | One tall vertical block [S] | A single shaft with an elevator, ledges alternating left/right, exits at many heights to Gallery, Library, Clock Tower and a warp room. Ranged skeletons on ledges fire across the shaft; medusa heads harass the climb. Mirror-self mini-boss half way. Soul of Wolf here [S]. |
| Long Library | One of two big "bookend" chunks [S]; stacked horizontal corridors of shelves [M] | Shop at the dead end (Master Librarian). Flying books and a fencer with long reach control the corridors; hidden plants spring from floors. Soul of Bat sits behind a mist grate; a mini-boss guards the approach [M]. Jewel of Open, Faerie Scroll here [S]. |
| Royal Chapel | Ascent: longest unbroken staircase in the game, a central tower with no horizontal redirect, smaller bell towers [S] | Background shifts from forest to sky as you climb [S]. Stairs make flying enemies (winged guards, crows) much nastier. Bell towers are vertical shafts with swinging bells and small ledges. Confessional booth: sit and a ghost priest either helps or stabs you. Spike corridor here needs armour found elsewhere [M]. |
| Castle Keep | Large L-shaped room plus a room cluster [S] | Open-air climb to the throne room; Leap Stone (double jump), Power of Mist and Ghost Card here [S]. Many breakable walls; the top is only fully reachable by flight. |
| Clock Tower | Other "bookend" chunk [S]; gear rooms then an open broken bridge [M] | Rotating gear teeth are the platforms; pendulums swing; medusa heads (gold ones petrify) fly sine paths through jump arcs. Striking four gears until each clicks opens a secret wall. Boss on the far balcony. Fire of Bat here [S]. |
| Olrox's Quarters | Ruined grand halls around a tall courtyard [M] | The tall central room cannot be crossed without flight - it shows you its far doors early. Elite humanoid trios and spectral swords. Echo of Bat here [S]. |
| Colosseum | Compressed and rigidly symmetric, like a hypogeum under an arena [S] | Two mirrored corridors of armoured knights wrap a central arena (duo boss). Form of Mist is the prize [S]; one-way gates become shortcuts after. |
| Underground Caverns | Three long horizontal rooms and three vertical ones [S] | Waterfall descent, flooded sections that hurt until Holy Symbol [S], a ferryman boat ride triggered by the Merman Statue [S], ice caves, a boss fought while the water rises. A fake save room starts a nightmare boss. |
| Abandoned Mine | Short vertical connector [M] | A small transit zone between caverns and catacombs with a boss in a pit, fire gremlins, and a switch only a familiar can press. |
| Catacombs | Strongly horizontal, never more than two rooms tall; the castle's bedrock [S] | Claustrophobic crypt runs, lava, coffins to smash, a pitch-black spike corridor navigated by bat sonar (reward: spike-proof armour that unlocks the Chapel corridor), body-ball boss at the end. |

Cross-area patterns worth noting [M]:
- Rewards and locks are deliberately placed in different areas (Catacombs armour opens a Chapel corridor; Library relic opens a Gallery door; Cavern statue calls a boat).
- Every area exits to 3+ neighbours, at different heights, so the castle is a web not a chain.
- The hub (Gallery/Clock Room) contains the final lock, seen in the first hour.

### Steal this for Vesperwrithe
- **Library**: stacked long corridors, shelf-ladders, flying tomes that open and fire letters; shop NPC at the dead end; one shelf slides to reveal the area's relic behind a grate.
- **Chapel**: one very long unbroken stair with flyers attacking along the diagonal; bell tower shaft where striking a bell stuns all enemies in the room (and wakes something); confessional booth with a 50/50 blessing or ambush.
- **Clock tower**: rotating gear platforms + pendulums + sine-wave flyers; a 4-gear strike puzzle opening a secret; a central clock whose hands gate two doors (one on a timer, one on a time-stop item).
- **Ramparts / outer wall**: single tall shaft with a hand-cranked elevator, alternating ledges, ranged enemies firing across the gap, exits at 4+ heights; use the pull-back camera here.
- **Crypt**: max two rooms tall, low ceilings, smashable coffins, a dark corridor that needs a light/sonar ability, reward that unlocks a hazard elsewhere.
- **Caverns**: water that damages until a relic is found; a boat ride set piece; a room whose water level rises during a fight.
- **Mines**: short vertical connector, minecart or lift, a switch only your familiar can reach.
- **Gardens/courtyard**: one tall open room that shows far doors you cannot reach without flight.
- **Colosseum**: mirror-symmetric corridors around a central arena; gates that become shortcuts after the fight.

---

## 2. SotN - relics, gating, shop, warps, saves, secrets

Relics (location, effect) [S: Gamer Corner relic table]:
- Soul of Bat (Long Library) - bat flight. Fire of Bat (Clock Tower) - bat fireballs. Echo of Bat (Olrox's Quarters) - sonar in bat form. Force of Echo (Reverse Caverns) - sonar damages.
- Soul of Wolf (Outer Wall) - wolf form. Power of Wolf (Entrance) - wolf run. Skill of Wolf (Alchemy Lab) - wolf special move.
- Form of Mist (Colosseum) - mist. Power of Mist (Castle Keep) - longer mist. Gas Cloud (Floating Catacombs) - poisonous mist.
- Leap Stone (Castle Keep) - double jump. Gravity Boots (Marble Gallery) - super jump.
- Jewel of Open (Long Library) - blue doors. Holy Symbol (Underground Caverns) - no water damage. Merman Statue (Underground Caverns) - calls the ferryman.
- Cube of Zoe (Entrance) - items drop from candles. Spirit Orb (Marble Gallery) - damage numbers. Faerie Scroll (Long Library) - enemy names. Familiar cards (Bat, Ghost and others).

What this teaches:
- Only about a third of relics are hard keys. The rest upgrade a form (longer mist, faster wolf, armed bat) or are UI unlocks (damage numbers, enemy names). UI as loot is cheap and feels generous.
- Each form has a three-step ladder (get form, improve form, weaponise form), spread across areas, so one mechanic pays out three times.
- Gates [M]: grate = mist; high ledge = double jump or super jump; wide gap/tall room = bat; blue door = bought key; damaging water = symbol; dark spikes = sonar + armour; hub floor = two rings found in opposite corners; true ending = an item that lets you see the real target.
- Soft gates: several relics can be reached early by skill or odd tools (old file covers this).

Master Librarian [M]: single fixed shop at the far end of the Library. Sells the castle map, the Jewel of Open (a progression key sold for money), consumables, mid-tier gear, and Library Cards (one-use warp back to him). He also buys gems. Late joke secret: super-jump into his chair from the room below and he drops rare items.

Teleport rooms [M]: five in the first castle; using one cycles you to the next in a fixed ring rather than showing a menu, and unvisited ones are skipped. Save rooms [M]: coffin heals fully; usually sit beside warp rooms and before bosses; one "save room" is a trap that starts a boss.

Secrets [M]: breakable walls/floors/ceilings with no visual tell beyond odd dead-ends on the map; food and gear inside walls; a cannon that opens a shortcut; swimming under a wall as wolf; switches only familiars press; an elevator that needs a hidden switch; chairs you can sit in; a telescope; equipment-set jokes (the knock-off "Alucart" set gives a big luck bonus when all three pieces are worn).

### Steal this for Vesperwrithe
- Sell one progression key in the shop early, at a price that takes about one area of drops to afford. It turns money into exploration.
- Give each traversal form a 3-step ladder: unlock, extend, weaponise - each found in a different zone.
- Make three relics pure UI: damage numbers, enemy names/HP bars, drop-rate reveal. Put them in the first two zones.
- One-use "return to shop" scroll as a common drop; it is fast travel with a cost.
- One fake save room that springs a boss. Do it once only.
- The final lock sits in the hub and is visible in the first hour; its two keys are in opposite corners of the map.
- Secret tells: a map cell with a wall where the grid suggests a room; a slightly different brick normal map; your familiar looks at it.
- A full knock-off gear set with weak stats and a hidden set bonus.

---

## 3. SotN - enemy roster as behaviour archetypes

What each classic enemy does, reduced to the behaviour you would code. [S] where a source confirmed it, else [M].

Ground melee:
- **Zombie** - spawns from the floor endlessly, walks straight at you [S]. A pressure/tempo enemy, not a threat.
- **Skeleton** - paces, throws bones in an arc, hops back from attacks [S].
- **Blood Skeleton** - cannot die; collapses when hit and reassembles after a few seconds [S]. A timing gate, not a fight.
- **Bone Scimitar** - advances and retreats in short hops, swings when in range; the basic "duelist" [M].
- **Axe Armor** - slow, tanky; throws axes high or low (jump or duck), melee swing up close [M].
- **Sword Lord / Armor Lord** - huge wind-up blow that launches you across the room [S]; armour variants add ground fire.
- **Spear Guard** - long thrust, throws spear when you are far [M].
- **Owl Knight** - knight plus owl; owl dive-bombs independently; kill the owl and the knight goes berserk [M].
- **Plate Lord / Flail Guard** - swings an iron ball in a circle, zone denial around itself [M].
- **Valhalla Knight** - mounted charge across the room [M].
- **Hammer, Blade, Gurkha** - elite trio with three ranges: heavy shockwave, mid sword, thrown knives [M].
- **Dhuron** - headless fencer with long rapier reach; can call lightning to charge the blade [S].
- **Skeleton Ape** - carries and hurls a barrel that explodes [M].
- **Warg** - big wolf, lunging bite, drives you backward down a corridor [M].

Ranged / stationary:
- **Bone Archer** - arcing arrows from ledges. **Bone Musket** - stand in a row and fire in sequence, a volley you must jump in rhythm [M].
- **Bone Pillar** - stacked dragon skulls spitting fire at fixed heights [M].
- **Slinger / Skelerang** - arc projectile / boomerang that returns from behind [M].
- **Merman** - leaps out of water, spits, drops back; knocks you into the water [S].
- **Stone Rose / Venus Weed / Thornweed** - plants; thornweed is hidden until you approach and grows into a bigger plant if left alone [S].
- **Ouija Table / Spellbook / Magic Tome** - possessed furniture and books; tomes open and shoot [M].

Flyers:
- **Bat** - hangs, then drops in a line, comes in waves [S].
- **Medusa Head** - endless spawns flying a sine wave across the screen [S]; gold variant petrifies [M]. Placed where the sine path crosses your jump arc.
- **Winged Guard** - erratic vertical bob, worst on stairs [S].
- **Ghost** - slow homing, passes through walls [S].
- **Harpy** - swoops and throws feathers. **Black Crow / Blue Raven** - perch until you pass, then dive [M].
- **Spectral Sword** - a floating sword that summons a ring of lesser weapons orbiting it, then flings them; kill the core and the rest drop [M].
- **Phantom Skull, Ectoplasm** - drifting curse/status carriers [M].
- **Ctulhu / Lesser Demon** - flyer that lands to fire a beam, hovers to cast [S for Lesser Demon].
- **Imp / Salem Witch** - small caster flyers; imp inflicts a control-scrambling status [M].

Erratic / gimmick:
- **Flea Man** - tiny, unpredictable hop height, hard to hit [S]. **Flea Armor** - same, armoured [M].
- **Diplocephalus** - two-ended beast; the tail end attacks separately from the head [M].
- **Marionette / Puppet** - jerky, casts curse [M].
- **Mudman** - forms from the floor, which also slows you [S]. **Slime** - splits [M].
- **Frozen Shade** - ice caster, shards fan out, freezes on hit [M].
- **Balloon Pod** - pops into poison spores when hit [S].
- **Bone Ark** - two skeletons carrying a skull cannon; kill the carriers to drop it [M].
- **Discus Lord** - throws a returning saw disc along the floor [M].
- **Gremlin** - runs and leaves a fire trail [M].
- **Paranthropus** - giant skeleton that throws its own bones [M].
- **Toad / Frog** - tongue grab; mostly harmless [S].

Archetype table (the reusable brains):
| Brain | SotN examples | Tested skill |
|---|---|---|
| Endless trickle | Zombie, Medusa Head, Bat | Keep moving; do not stop to farm |
| Duelist (advance/retreat) | Bone Scimitar, Dhuron | Spacing, backdash |
| High/low thrower | Axe Armor | Read jump vs duck |
| Launcher | Sword Lord | Respect a long tell |
| Rhythm volley | Bone Musket row | Jump timing |
| Sine/erratic flyer | Medusa Head, Winged Guard, Flea Man | Air control on stairs/platforms |
| Undying | Blood Skeleton | Move through in the window |
| Core + orbiters | Spectral Sword | Target priority |
| Paired AI | Owl Knight, Bone Ark | Kill order changes behaviour |
| Returner | Skelerang, Discus Lord | Watch your back |
| Ambusher | Thornweed, crows, Mudman | Area memory |
| Status carrier | Gold Medusa, Imp, Ectoplasm | Carry cures / Ward gems |
| Zone denier | Plate Lord, Gremlin | Find the gap |

### Steal this for Vesperwrithe
- Build 13 enemy brains (table above), reskin per zone. Each zone introduces two new brains and remixes two old ones.
- Sine-wave endless flyer in every vertical/gear room, with a petrifying rare variant.
- Undying skeleton in corridors before save rooms: it is a rhythm obstacle, never XP.
- Musket row: three ranged enemies firing 0.4 s apart on a ledge across a shaft.
- Core-and-orbiters enemy that borrows weapon models from the player's loot table and drops one.
- Paired enemy whose survivor enrages (knight + raven).
- An ambush plant that grows a tier if ignored for 20 s, with a better drop.
- Possessed furniture in the library and banquet hall: free props double as enemies.

---

## 4. SotN - boss mechanics

All [M] unless tagged; [S] items from Castlevania Dungeon boss pages.

- **Slogra & Gaibon** (Alchemy Lab) - duo. Ground spearman lunges and pogo-hops; flyer spits diagonal fire and can lift and drop his partner. Damage thresholds change them: spearman loses the spear and switches to beak pecks; flyer turns red and breathes wider fire. Lesson: two simple brains with a kill-order choice, plus a mid-fight moveset swap.
- **Doppleganger** (Outer Wall) - copies the hero's own kit: backdash, jump slash, thrown subweapon, mist dodge; later version adds a form-charge [S]. Lesson: mirror fight teaches the player their own moves.
- **Hippogryph** (Chapel roof) - alternates ground and air: running/flying charges, grounded fire breath with a safe spot crouched close [S], overhead swoop. Flat arena, two patterns [S].
- **Scylla** (Caverns) - two-stage set piece: fight a wyrm first; then the main body, whose serpent heads strike from the sides and must be destroyed one at a time while the water in the room is itself a hazard [S] and rises, pushing you up the platforms.
- **Minotaur & Werewolf** (Colosseum) - heavy + fast pair in a flat arena: charging axe bruiser and an acrobat with dash kicks and a fireball. Different ranges force you to keep both on screen.
- **Karasuman** (Clock Tower balcony) - flying caster: releases a flock from its wings and fires charged feathers in fans [S]; open-air arena with a drop.
- **Olrox** (banquet hall) - phase 1 hovers and teleports, raises souls from the floor, opens a portal of skulls, fires beams [S]; at a damage threshold becomes a huge lizard that breathes fire and punches [S]. Lesson: caster phase then brute phase in the same room changes how the long room is used.
- **Granfaloon / Legion** (Catacombs) - a floating ball of bodies. The shell sheds walking corpses constantly; break the shell in sections to expose tentacles that fire lasers from the opened side [S]. Lesson: the player chooses which side to open, which decides where lasers come from.
- **Succubus** (nightmare) - flyer who stabs with extending wing spikes, then splits into copies; only the real one behaves differently (does not shoot) [S].
- **Cerberus** (Mine) - three heads firing different fireballs straight and upward to punish jumpers [S]; pounces. Small pit arena.
- **Richter** (Keep) - a fast human with a full player moveset: slide, whip, uppercut, dash, subweapon supers. Killing him gives the bad ending; wearing a specific item reveals the orb controlling him, and that orb is the real target. Lesson: the best "puzzle boss" in the genre - the fight is winnable the wrong way.
- **Death** (inverted cave) - phase 1 drifts side to side while small sickles converge on you from off-screen [S]; phase 2 is a large skeletal form with a blade on each arm [S]. Lesson: summoned swarm that can be cut down for resources, then a reach-based duel.
- **Galamoth** (Floating Catacombs) - enormous; you fight at ankle and head height in a tall room. Stomps, lightning from a rod, short-range dark spheres [S]. Thunder-resist gear turns the fight [S]. Lesson: optional superboss whose answer is a gear check you find by reading the bestiary.
- **Shaft** - floats in a bubble with six orbs that fire lightning/fire or ricochet [S]. **Dracula** - screen-filling seated form: hand swipes, fireball fans, meteors, a teleport grab; only the head is vulnerable.
- Also: **Beelzebub** - immobile hanging corpse you dismember piece by piece while it sends flies [S]. **The Creature** - hammer slams and a rolling attack on a strict loop [S]. **Darkwing Bat** - wing gusts push you to the wall [S]. **Fake trio** - three hero copies with three roles at once [S].

Patterns:
- Arenas are plain; the boss body is the geometry (Granfaloon, Galamoth, Beelzebub).
- Phase change = different creature silhouette, not a faster version.
- Several bosses have a gear/element answer rather than only a dexterity answer.
- Duo bosses pair one grounded and one airborne/fast body.

### Steal this for Vesperwrithe
- **Duo guardians (first boss)**: flat arena, two side ledges. Spearman lunges; gargoyle spits diagonal fire and at 50% picks the spearman up and drops him as a ground slam. Kill the gargoyle first and the spearman enrages; reverse, and the gargoyle gets a wide breath.
- **Mirror knight**: uses your equipped weapon class and your dodge. Reads your current loadout at fight start.
- **Chapel griffin**: alternates ground charge and aerial dive; dive leaves a burning strip for 4 s; safe pocket crouched under the breath.
- **Flooded-crypt hydra**: water rises one platform tier per head killed; water damages unless the ward relic is owned.
- **Corpse orb**: three shell plates; the plate you break decides which arc the beam sweeps. Sheds walkers that drop hearts.
- **Possessed ally**: killable for a bad ending; a lens item shows the puppeteer orb circling overhead - hit that instead.
- **Banquet lord**: caster phase (teleport, floor souls) then beast phase (charges that smash the table props, removing your platforms).
- **Colossus superboss**: two-screen-tall body, platforms at ankle and head; lightning-ward gems cut its main attack by half.
- **Reaper**: sickle swarm from off-screen (each sickle killed returns 1 MP), then dual-blade duel.

---

## 5. SotN - weapons, specials, RPG systems, familiars

Weapon specials:
- **Command inputs** [S: Gamer Corner]: about 20 weapons have a hidden move on quarter-circle-forward + attack or back-forward + attack (some have both), covering fists, short swords, two-handers, clubs and named swords. Nothing in the UI tells you.
- **Crissaegrim** - each swing is a burst of four very fast hits [S], shown as vacuum blades [S], and it does not root you. One-handed. Famous for breaking the game.
- **Shield Rod** - with a shield in the other hand, pressing both attack buttons casts a spell that depends on the shield [S]: defence buff animals, a gorgon that fires rays, a thrown-sword warrior, an axe lord that walks ahead, elemental wards, an INT buff, screen-crossing skull bolts or fire serpents, a screen-wide dark hit; the top shield makes hits drain life and give hearts [S]. **Mablung Sword** does the same as a real sword [S].
- **Sword of Dawn** - command summons a random soldier (archer, swordsman, mage), rarely a whole squad; several can exist at once [S].
- **Muramasa** - cursed katana; same circular slash as Yasutsuna but only while standing [S]; attack grows permanently as it drinks blood from bleeding enemies [M].
- **Yasutsuna** - fast ring of slashes usable while moving, lowers defence [S].
- **Osafune katana** - command: teleport forward, several cuts, return to start [S].
- **Alucard Sword** - has a command special [S]: short warp past the enemy with a cut from behind [M].
- **Runesword** - thrown as a spinning arc that returns [S]. **Heaven Sword** - thrown straight and returns; two equipped unlock a combined volley [M].
- **Mourneblade** - heals on hit [S]. **Marsil** - multi-hit flame blade, command sends fire across the screen [S]. **Jewel Sword** - kills can turn into gems [S]. **Terminus Est** - poison [S].
- **Badelaire** - attack scales with hours played. **Sword familiar** - at familiar level 50 it becomes an equippable sword [S]. **Stone Sword** petrifies; **Were Bane** bonus vs beasts; **Tyrfing** is a cursed stat-penalty blade [M].
- **Fists** (Fist of Tulkas) - both commands [S]; rapid flurry. **Two-handers** - back-forward thrust/lunge [S].
- Two hands map to two buttons, so sword + shield, sword + sword, sword + thrown, or two consumables are all loadouts [M].

Spells [M]: motion inputs on the pad, usable before you "learn" them; MP cost; examples: blood-heal stance (enemy blood restores HP), homing spirits, teleport-fireball, life drain from all on screen, invincible bat dash (Wing Smash), familiar sword barrage.

Levelling and stats [M]:
- XP per kill scales with the gap between enemy level and yours, falling toward 1 XP for enemies far below you. This self-limits grinding.
- STR (physical), CON (defence, status), INT (spell power), LCK (drops, crits). Max HP/hearts also come from hidden pickups, so exploring is levelling.
- Starting stats depend on how you played the prologue fight (damage taken, speed, subweapon use) and on a dialogue beat.
- Equipment carries resist/absorb per element; a few pieces flip a boss's main attack into healing.

Familiars [M]:
- Card relics; one active; each levels to 99 by being out while you kill.
- Bat (attacks; joins as a flock when you are in bat form), Ghost (slow drain), Faerie (uses your potions, cures status, revives you with a held item), Demon (attacks, presses switches), Sword (attacks; later a weapon and a spell).
- New behaviours unlock at level thresholds, so a starter familiar stays relevant.

### Steal this for Vesperwrithe
- Give every weapon class a hidden command move (quarter-circle + attack). Record discovered moves in the codex; drop "technique scrolls" that reveal one.
- Shield + rod system: the off-hand item decides the spell. Maps directly onto Ward-socket gems: off-hand gem family = spell cast.
- A summon blade (random soldier of three types, 2% whole squad).
- A blood-drinking cursed blade: +1 ATK per 50 bleed procs, cap per player level, drains HP while sheathed.
- Warp-cut special on the signature sword; teleport-flurry-return on the katana class.
- A returning thrown sword; dual-wielding two unlocks a combined move.
- A deliberately absurd late drop (four-hit, move-while-attacking) from one rare enemy in an optional room - but cap it with a Litany/gem restriction so it is a build, not the build.
- XP scaled by level gap; hidden HP/MP vessels in walls.
- Tutorial-fight performance sets small starting bonuses.
- Familiars with level-gated verbs: press switch, use potion at low HP, revive once, become a weapon at 50.

---

## 6. Hollow Knight: Silksong (Sept 2025)

### 6.1 Movement kit
- **Swift Step** - dash, and held it becomes a sprint; first ability, from the top of Deep Docks [S]. Sprint feeds longer jumps and a dash attack [M].
- **Cling Grip** - wall cling and wall jump [S]. It is the point where Act 1 opens up, unlocking many areas at once [S].
- **Drifter's Cloak** - glide/float; rides wind currents upward [S]; earned from a quest giver, not a boss [S].
- **Clawline** - grapple that latches to surfaces, enemies, or fires into empty air as a lunge [S]; found mid Act 2, and has two different access routes [S]. It is also the fix for hard-to-reach flying enemies [S].
- **Faydown Cloak** - double jump from the top of a cold mountain climb [S]; arrives late and makes earlier platforming trivial [S].
- **Silk Soar** - charged vertical launch, Act 3 [S]. **Needolin** - an instrument that opens certain doors [S].
- **Down attack / pogo** - depends on the equipped crest. The starting Hunter crest dives at 45 degrees rather than straight down [S], which critics found hard for platforming [S]. Other crests give a wide downward arc, a short straight pogo, a drill dive, etc. [S].
- Ledge mantling and faster healing than the first game [S].

### 6.2 Silk, healing, tools, crests
- Hitting things fills Silk; a Bind spends it to heal three masks at once [S]. So healing is a burst you must earn and find a window for. Silk also pays for Silk Skills (special attacks found at Weaver sites) [S].
- **Tools** in three colours [S]: red = offensive, manually thrown/placed, limited charges; blue and yellow = passive (defensive/support and exploration/economy). Red charges refill at benches by spending Shell Shards [S].
- **Crests** set the whole loadout shape [S]: needle moveset, bind behaviour, and how many slots of each colour.
  - Hunter: balanced, 45-degree dive, upgradable [S]. Reaper: slow wide swings, classic down arc, bind makes hits give extra silk for a while [S]. Wanderer: fast short strikes, straight pogo [S]. Beast: claws, bind triggers a lifesteal rage instead of a plain heal [S]. Witch: wide arcs, bind does not heal but drains nearby enemies [S]. Architect: drill attacks, three red slots, spends silk to refill tools in the field, cannot use Silk Skills [S]. Shaman: no tools, extra Silk Skill slots, slashes fire beams [S].
  - Community DPS tests found them close to balanced [S].
- Currency: rosaries (shop money, dropped on death in a cocoon you must retrieve) and shell shards (tool ammo) [S].

### 6.3 Bosses and enemies
- Team Cherry rebuilt enemy AI around Hornet's speed: the first game picked attacks based on where the slow Knight stood; Silksong picks a move and a movement together, so enemies reposition, evade and "check" you as you dart away [S].
- A basic ant soldier uses the moveset of the first game's Hornet boss plus evade and check moves [S]. Even small enemies borrow pieces of Hornet's kit to pin her down [S].
- Boss silhouettes are tall and lean to match Hornet (the Last Judge would have been a round blob in the first game) [S].
- 40+ bosses with varied structures were widely praised [S]; roughly 20 mandatory and 25 optional by one count [S].
- Fights praised from memory [M]: fencer duels that reward parry-clashes; a duo of clockwork dancers whose attacks follow the music and speed up each phase; a bell boss whose arena hazards fall from the ceiling in readable rows; a duo fight that first teaches one member alone, then both, then adds falling fire [S for that last structure].
- Criticisms: extra small enemies inside boss rooms [S]; contact damage even while a boss is stunned, and many two-mask hits [S]; flyers that hover just out of reach and react to inputs [S]; pre-boss gauntlets [S].

### 6.4 World design
- "Concertina" pacing [S]: Act 1 mostly linear on a U-shaped path with the next lock near each new key; Act 2 opens wide (three objectives in any order); Act 3 mixes both.
- Skips are built in: several bosses in Act 1 can be bypassed by hidden routes or a relocating caravan [S]. If stuck, you can go and gather power elsewhere [S].
- Maps are bought per area; rooms fill in only when you rest; open exits are shown so players "poke" at loose ends [S]. Secret walls (50+) are not shown, and one whole area is behind them [S].
- Two fast-travel networks (a beast for the lower world, pneumatic tubes for the citadel) joined at one point [S].
- Benches: heal, respawn, change crest/tools/skills [S]. Some cost money, used as storytelling about the citadel [S]; some are trapped [M].
- A trap enemy can capture you and send you to a prison area without gear - a memorable interruption [S].
- Side quests ("wishes") from boards and NPCs give direction when stuck and pull you back to old areas [S]; some reviewers found the fetch ones dull [S].
- Critic consensus [S]: praise for fluid precise controls, layered art and depth, music, cohesive world that rewards curiosity, value. Complaints: long runbacks (patched in places), sparse benches, scarce money, tool-ammo busywork that punishes exactly the players who are struggling, an obscure true-ending requirement.

### Steal this for Vesperwrithe
- **Stance crests**: 4-5 "Orders" that each change the down-attack angle, dash attack, heal behaviour and gem-slot layout. One has a straight pogo, one a diagonal dive, one a wide arc.
- **Earned burst heal**: hits fill a blood gauge; one heal = 3 pips, takes 0.8 s, usable in air. Makes boss openings double as heal windows.
- **Heal variants per Order**: plain heal / drain nearby enemies / rage with lifesteal / refills throwables.
- **Sprint from held dash**, with a sprint-jump and sprint-attack.
- **Grapple that works on enemies and empty air**, introduced mid-game, with two routes to obtain it.
- **Enemy AI picks move + movement**: every elite has one evade (hop back, roll through) and one check (fast poke that punishes retreat).
- **Music-synced duo boss** in the clock tower: attacks land on the beat, tempo rises per phase; when one falls the other changes pattern.
- **Teach-one-then-two** duo structure, then add an arena hazard for the last phase.
- **Bypass routes** for two early bosses via secret paths.
- **Map "loose ends"**: show unexplored exits as open stubs. Mark secret-wall rooms after a relic is found.
- **Avoid**: adds in boss rooms, ammo you must farm, runbacks over 30 s, contact damage from stunned bosses, double-damage basic enemies.

---

## 7. Best single ideas from four other games

All [M] unless tagged.

**Hollow Knight (2017)**
- Boss: the Mantis Lords structure - duel one, then two at once with interleaved attacks [S]; a readable three-move set (side dash, drop from above, boomerang) [S]; winning earns the tribe's respect so their soldiers stop attacking you. Reward is a changed world, not an item.
- Level: every area has several entrances, and the early game forks so two players have different second hours; maps are bought and only update at rest.
- Gating: one ability (wall jump) re-reads the whole map rather than opening one door. Later gates are hazards you become immune to (acid) rather than walls.

**Bloodstained: Ritual of the Night (2019)**
- Boss: the twin-dragon tower - you run around the outside of a cylindrical tower and the camera orbits it while the dragon's two heads attack from both sides. The one fight that uses 2.5D for something 2D cannot do.
- Level: a late ability flips gravity on demand, turning the "inverted castle" idea into a button; rooms are built to be read both ways up.
- Gating: a light-beam ability that ricochets you through mirrors and narrow gaps; a blood-drinking power taken from a boss who used it against you, then used to drain a blood fountain blocking the path.

**Metroid Dread (2021)**
- Boss: every attack has a specific answer and bosses are fully no-hit-able; a successful melee counter starts a cinematic grab during which you keep free-firing for bonus damage.
- Level: the map quietly closes doors behind you (collapses, temperature locks, one-way drops) so the open-looking world funnels you in a loop toward the next upgrade; checkpoints sit right before bosses and stalker zones [S].
- Gating: stalker zones with their own door style and rules, where an unkillable hunter patrols; killing it later (with a one-off power) grants the ability it used on you. Critics split on whether later zones became rote [S].

**Blasphemous (2019)**
- Boss: screen-filling tableau bosses (a giant face with hands, a carried corpse) with two or three slow, heavily telegraphed attacks and bullet patterns; the spectacle is the body, the mechanics are simple.
- Level: Souls-style interlocking shortcuts - kicked-down ladders, one-way gates, lifts - all folding back to shrines; level design was the most praised part [S].
- Gating: relics that change the world rather than the hero (blood platforms appear, roots grow into ledges, poison mist becomes harmless, deadly falls into mud become entrances). Death leaves a guilt fragment at the spot that reduces your resource bar until reclaimed or absolved at a shrine [S].

### Steal this for Vesperwrithe
- A tribe/faction that stops attacking after you beat its champions.
- One boss on a round tower where the three.js camera orbits as you run - the showcase 2.5D fight.
- Counter-into-grab: a perfect parry on a boss opens a 2 s free-hit cinematic.
- A stalker zone in the dungeons with an unkillable warden; later you kill it and take its ability.
- World-state relics: one makes spectral platforms visible, one makes thorn vines grow into ledges, one lets you survive falls into the oubliette.
- Doors that lock behind you for a short loop, then reopen as shortcuts.
- Gravity-flip rooms in the clock tower instead of a whole inverted castle.

---

## 8. Cross-cutting rules (new, not in file 1)

1. Bosses change silhouette between phases, not just speed.
2. The boss's body can be the arena geometry.
3. Each zone: 2 new enemy brains + 2 remixed.
4. Each traversal mechanic pays out three times (unlock, extend, weaponise).
5. Put the key and its lock in different zones.
6. Linear stretch, open stretch, linear stretch.
7. Offer a way round at least two early bosses.
8. UI features can be loot.
9. Hidden weapon moves give depth with zero UI cost.
10. Healing should be earned by aggression and spent in a risky window.
11. Elite AI = attack + evade + check.
12. One showcase moment per zone that only 2.5D can do (camera orbit, pull-back, depth reveal).

---

## 9. Sources

SotN areas, relics, weapons, bosses, enemies:
- https://doshmanziari.substack.com/p/economy-and-thematic-structure-symphony (area shapes, primary-space rule, staircase drama)
- https://guides.gamercorner.net/sotn/relics/ (relic locations and effects)
- https://guides.gamercorner.net/sotn/weapons/?s=spc&d=d (which weapons have command specials)
- https://guides.gamercorner.net/sotn/weapons/crissaegrim
- https://www.hardcoregaming101.net/cvbackup/sotn-wep.htm (Shield Rod spells, Sword of Dawn, Osafune, Muramasa, Runesword, Marsil)
- https://castlevaniadungeon.net/char/bosses/sotn_a-k.htm (boss behaviours A-K)
- https://castlevaniadungeon.net/char/bosses/sotn_l-z.htm (boss behaviours L-Z)
- https://www.hardcoregaming101.net/cvbackup/enemy.htm (recurring enemy behaviours)
- https://www.ludo.guide/guide/castlevania-symphony-of-the-night/hippogryph
- https://en.wikipedia.org/wiki/Dracula%27s_Castle_(Castlevania:_Symphony_of_the_Night)

Silksong:
- https://en.wikipedia.org/wiki/Hollow_Knight:_Silksong (gameplay systems, reception, scores)
- https://www.nintendolife.com/guides/hollow-knight-silksong-crests-guide-all-crest-locations-and-effects (crest movesets and slots)
- https://www.gamesradar.com/games/silksong-abilities-skills-powers (ability list)
- https://gmtk.substack.com/p/the-world-design-of-hollow-knight (act structure, skips, map, benches, quests)
- https://consolepcgaming.com/how-team-cherry-evolved-hollow-knights-bosses-for-silksong (move-and-movement AI, tall silhouettes)
- https://www.gamesradar.com/games/platformer/compared-to-hollow-knight-silksong-reworked-how-the-bosses-pick-their-attacks-and-suddenly-i-realize-why-i-got-crushed-so-often
- https://aftermath.site/silksong-problems-runback-criticism (runbacks, shard economy, contact damage)
- https://www.pcgamer.com/games/action/silksong-sickos-have-already-painstakingly-determined-the-dps-of-every-crest-in-the-game-and-you-might-want-to-switch-off-reaper
- https://beebom.com/hollow-knight-silksong-review
- https://www.videogameschronicle.com/review/hollow-knight-silksong/
- https://www.pcgamesn.com/hollow-knight-silksong/review

Others:
- https://nintendolife.com/guides/hollow-knight-boss-locations-and-moves-list (Mantis Lords moves)
- https://videogameschronicle.com/review/metroid-dread (checkpoints before bosses and EMMI zones)
- https://www.hardcoregaming101.net/metroid-dread/
- https://metroidvaniareview.com/blasphemous/ (level design praise, guilt)
- https://techraptor.net/gaming/reviews/blasphemous-review

Caveats: the Castlevania and Hollow Knight fan wikis and StrategyWiki refused automated fetches this session, so much SotN room, enemy and boss detail (and the named Silksong boss examples, Bloodstained, Dread and Blasphemous specifics) is tagged [M]. The [M] items most worth checking before anyone relies on them: the Clock Room statue rules, the teleporter cycling behaviour, Muramasa's growth rule, the Alucard Sword warp input, XP scaling by level gap, the Minotaur/Werewolf move lists, and which area the Hammer/Blade/Gurkha trio lives in.
