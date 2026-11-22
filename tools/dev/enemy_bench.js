// Enemy balance bench. An async function body evaluated in the game page by a Playwright harness that has booted a new
// journey with window.__pause = true (see tools/dev/shoot.cjs for one), e.g.
//   node <harness>.js tools/dev/enemy_bench.js '{"lvls":[1,13,29],"types":["zombie","knight"]}'
// For each regular enemy type and each hero level it reports
//   htk      swings of an at-level one-hand sword to kill it (the foe stands still, guard down), with min-max over `runs`
//   far/near life a passive hero loses to it in 10 s and the blows that landed: 6 m off facing it, then 1.8 m off, back turned
//   worst    the largest single blow, as a share of the hero's life
// and for minibosses and bosses the swings needed at their own level. The bench hero: level L, Strength and Constitution at two
// points a level, a plain sword of item level L, defence 4 + 2.6 L (catalog.js heroHit / heroEHP assume the same).
const cat = await import('/src/catalog.js'), B = cat.BESTIARY, P = game.player, A = ARG || {};
const lvls = A.lvls || [1, 13, 29], runs = A.runs || 3, only = A.types, out = [];
window.__norender = true;
let benchDef = 0; if (!P._derived0) { P._derived0 = P.derived; P.derived = function () { const d = P._derived0.call(this); d.def = benchDef; return d; }; } // at-level armour, whatever is worn
const hero = async L => {
  const s = P.stats; s.lvl = L; s.str = 10 + 2 * (L - 1); s.con = 10 + 2 * (L - 1);
  for (const k of Object.keys(P.equip)) P.equip[k] = null;
  await gear('iron_sword', { lvl: L, rarity: 'normal' }); P.equip.weapon.lvl = L; benchDef = Math.round(4 + 2.6 * L); P.refreshStats(); s.hp = s.hpMax; s.potions = 0; // item level L: (7 + 2.9 L) a swing
};
const spawn = async (t, L) => {
  await lineup([t]); const e = game.room.enemies[0], T = e.T;
  if (T.cls) { const st = cat.statsAt(T, L); e.lvl = L; e.hpMax = e.hp = st.hp; e.ds = st.dmg / T.dmg; e.xp = st.xp; }
  P.state = 'free'; P.inv = 0; P.stats.hp = P.stats.hpMax; P.vel.set(0, 0); return e;
};
for (const L of lvls) {
  await hero(L);
  for (const [t, T] of Object.entries(B)) {
    if (!T.cls || (only && !only.includes(t))) continue;
    const row = { t, L, cls: T.cls, hp: cat.statsAt(T, L).hp }, hs = [];
    for (let r = 0; r < runs; r++) { // ---- swings to kill: the foe is frozen where lineup put it, standing on the floor, guard down
      const e = await spawn(t, L); e.pos.y = game.room.b.y0 + 0.5; e.state = 'rest'; e.cling = 0; e.hidden = false; e.sync(0);
      P.pos.set(e.pos.x - 1.1, e.pos.y); P.facing = 1; let n = 0, f = 0, hp = e.hp;
      while (!e.dead && f < 1200) { sim(1, [], f % 22 === 0 ? ['KeyJ'] : []); f++; P.inv = 0; if (e.hp < hp) { n++; hp = e.hp; } e.stun = 0; if (!e.dead) e.state = 'rest'; }
      hs.push(e.dead ? n : 99);
    }
    row.htk = Math.min(...hs) + (Math.min(...hs) === Math.max(...hs) ? '' : '-' + Math.max(...hs));
    for (const [key, dist, face] of [['far', 6, 1], ['near', 1.8, -1]]) { // ---- a hero who just stands there for 10 s: 6 m off facing it, then 1.8 m off with their back turned
      const e = await spawn(t, L); delete e.update; e.reset(); e.root.visible = !['buried', 'under'].includes(e.state);
      P.pos.set(e.pos.x - dist, game.room.b.y0 + 0.5); P.facing = face; let lost = 0, blows = 0, worst = 0;
      for (let f = 0; f < 600; f++) { const h0 = P.stats.hp; sim(1); const d = h0 - P.stats.hp; if (d > 0) { lost += d; blows++; worst = Math.max(worst, d); } P.stats.hp = P.stats.hpMax; if (P.state === 'dead') P.state = 'free'; P.poisoned = 0; }
      row[key] = Math.round(lost / P.stats.hpMax * 100) + '% in ' + blows; row.worst = Math.max(row.worst || 0, Math.round(worst / P.stats.hpMax * 100));
    }
    out.push(row);
  }
}
// ---- great foes: swings at their own level (life / the bench hero's mean swing), and the seconds that is at a steady 1.3 swings a second
const great = [];
if (!only) for (const [t, T] of Object.entries(B)) {
  if (T.cls) continue; await hero(T.lvl); let sum = 0; for (let i = 0; i < 400; i++) sum += P.rollDamage().dmg; const mean = sum / 400;
  great.push({ t, L: T.lvl, kind: T.mini ? 'mini' : 'boss', hp: T.hp, swings: Math.round(T.hp / mean), secs: Math.round(T.hp / mean / 1.3), blow: Math.round(T.dmg * (T.tier >= 3 ? 1.25 : 1) * 100 / (100 + benchDef) / P.stats.hpMax * 100) + '%' });
}
window.__norender = false;
const pad = (s, n) => String(s).padEnd(n);
return 'type               L   cls     hp    htk   far 10s     near 10s    worst blow\n' + out.map(r => pad(r.t, 18) + pad(r.L, 4) + pad(r.cls, 8) + pad(r.hp, 6) + pad(r.htk, 6) + pad(r.far, 12) + pad(r.near, 12) + r.worst + '%').join('\n')
  + (great.length ? '\n\ngreat foe          L   kind  hp     swings secs  blow\n' + great.map(r => pad(r.t, 18) + pad(r.L, 4) + pad(r.kind, 6) + pad(r.hp, 7) + pad(r.swings, 7) + pad(r.secs, 6) + r.blow).join('\n') : '');
