# Symphony of the Night weapon swings: frame data (and what the BM knights add)

Source: the sotn-decomp project (github.com/Xeeynamo/sotn-decomp: `src/dra/alu_anim.c`, `src/weapon/w_0xx.c`), which is
the game's own data. Frames are game frames at 60 fps; hitboxes are pixels from Alucard's origin (he is ~45 px tall).

| Class | Standing | Crouch | Air | Reach |
|---|---|---|---|---|
| Sword | 27 f | 27 f | 19 f | 65 px |
| Short sword | 33 f | 27 f | 18 f | 49–53 px |
| Two-handed | 32 f | 29 f | 18 f | 76 px |
| Mace / Shield Rod | 33 f | 25 f | 13 f | 48 px |
| Fist | 19–26 f | 14–20 f | 7 f | tiny |
| Knife | 17 f | 12 f | 7 f | — |

- Sword, standing: wind-up 2 f, swing poses 9 f, recovery 16 f (4 poses × 4 f). The hitbox exists on frame 1, full reach
  by frame 3 (a thin chest-height band, centre 30 px ahead, 35 × 8 half-size), shorter from frame 7.
- The crescent IS the weapon: an additive, semi-transparent overlay locked to the body, ~4 f at full size, 5 f shrinking.
- Mace: the first swing pose hangs ~11 f, then a true overhead-to-front-down arc.
- Thrust swords (Estoc) lunge forward; Crissaegrim-type blades spawn a slash quad and let you walk.
- One swing per weapon, seven body variants of it: stand, stand at a ledge, crouch, crouch with a direction held, rising,
  falling, falling with down held. Stand ↔ crouch can swap during the first poses without restarting.
- Ground swings halve horizontal speed and plant the feet; air swings keep the jump's momentum and cannot turn.
- Landing cancels an air swing outright (jump-cut, land, cut again); walking off a ledge cancels too.
- The lock ends before the animation: the long sheathe tail is cosmetic and interruptible.

From the BM repo (Agilancer/bm: `src/sim/knight.js`, `src/sim/hero.js`, `tools/fp_arms/swings*.py`):
- Big blows wind up slow and land fast; the fist's speed is one hump that peaks just before the hit.
- The chest turns into the blow (twist shared down the spine) and never folds face down (pitch capped ~0.7 rad).
- The blade is on a line and the edge leads; the sword never turns in the fist, the fist rolls.
- Every blow starts and ends on one guard pose, so any blow chains into any other.
- Fingers stay shut on the grip; the off hand rides the shaft of a two-hander (two-bone IK), and slides on a spear.
- Thrusts draw back past the hip, drive out to a straight arm, hold, then come home; the flash leaves the point.
- A hit: 0.07 s stop (0.10 heavy), a kick of camera trauma along the cut, the struck thing shoved.

How Vesperwrithe uses it: `src/swing.js` (one keyed swing per weapon class, solved onto the hero's arm each frame, the same
cut standing, crouching and airborne), `src/player.js` `startAttack` / `updateAttack` (hit window, step-in, cancel, landing
cancel) and `Trail` (the crescent).
