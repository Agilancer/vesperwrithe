// Headless review shots of rooms (dev only). Needs the game served on localhost (python tools/serve.py 8410).
//   node tools/dev/shoot.cjs <outDir> <roomId> [roomId...]            gameplay-camera views of every screen of each room,
//   plus a whole-room overview and the same overview with the collision drawn over it (red = solid, yellow = one-way ledge,
//   orange = hazard): any red with nothing drawn under it is an invisible wall.
// env: PORT (8410), W/H (1280x720), BELLS=all (give every bell first: echo ledges shown, veils gone)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [out, ...ids] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/GPU stall/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await p.goto('http://localhost:' + (process.env.PORT || 8410) + '/index.html?touch=0');
  await p.waitForFunction(() => !document.getElementById('startBtn').classList.contains('hidden'), null, { timeout: 300000 });
  await p.evaluate(() => { localStorage.clear(); return window.boot(); });
  await p.waitForFunction(() => window.game && window.game.room && !window.game.loading, null, { timeout: 300000 });
  await p.exposeFunction('shotP', async name => { await p.screenshot({ path: out + '/' + name + '.png' }); return name; });
  const res = await p.evaluate(async ({ ids, bells, maxv }) => {
    const T = await import('three'); const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    document.getElementById('hud').style.display = 'none'; if (bells) give();
    const G = game, cam = G.camera, tanH = Math.tan(cam.fov * Math.PI / 360), out = [];
    const look = async (x, y, z) => { cam.position.set(x, y + 0.45, z); cam.lookAt(x, y, 0); G.camFill.position.set(x + 3, y + 4, 14); G.camFill.target.position.set(x, y, 0); G.world.update(G.time, 0, G.room, { x, y }); await frame(); };
    for (const id of ids) {
      const r = G.world.byId(id); if (!r) { out.push(id + ': no such room'); continue; }
      const d = r.def, sx = d.start?.x ?? (d.doors.find(o => o.side === 'W') ? 2 : d.doors.find(o => o.side === 'E') ? d.w * 13.333 - 2 : d.w * 6.667);
      const dr = d.doors.find(o => o.side === 'W') || d.doors.find(o => o.side === 'E'), sy = dr ? (d.row + d.h - 1 - dr.row) * 7.5 + 0.6 : 0.6;
      window.__pause = false; await tp(id, sx, d.start?.y ?? sy, 40); window.__pause = true;
      const B = G.room.b, W = B.x1 - B.x0, H = B.y1 - B.y0, z = 14.2, hh = tanH * z, hw = hh * cam.aspect;
      // gameplay views: one per screen, clamped to the room like the play camera
      const nx = Math.max(1, Math.round(W / (hw * 2 * 0.9))), ny = Math.max(1, Math.round(H / (hh * 2 * 0.9))); let n = 0;
      const cells = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) cells.push([nx === 1 ? (B.x0 + B.x1) / 2 : B.x0 + hw + (W - 2 * hw) * i / (nx - 1), ny === 1 ? Math.max(B.y0 + hh - 0.35, (B.y0 + B.y1) / 2 - 0.4) : B.y0 + hh - 0.35 + (H - 2 * hh + 0.55) * j / (ny - 1)]);
      // big rooms: an even sample of the screens (the overview shows the rest); screens that hold collision or foes come first
      const busy = ([cx, cy]) => G.activeSolids().filter(s => s.kind !== 'floor' && s.kind !== 'ceil' && s.kind !== 'wall' && s.x1 > cx - hw && s.x0 < cx + hw && s.y1 > cy - hh && s.y0 < cy + hh).length + G.room.enemies.filter(e => Math.abs(e.pos.x - cx) < hw && Math.abs(e.pos.y - cy) < hh).length + (cy < B.y0 + hh + 1 ? 2 : 0);
      const pickN = Math.min(cells.length, maxv), chosen = cells.map((c, i) => [c, busy(c), i]).sort((a, b) => b[1] - a[1]).slice(0, pickN).sort((a, b) => a[2] - b[2]).map(c => c[0]);
      for (const [cx, cy] of chosen) { await look(cx, cy, z); await shotP(`${id}_v${String(++n).padStart(2, '0')}_x${Math.round(cx - B.x0)}_y${Math.round(cy - B.y0)}`); }
      // overview, then the same with the collision drawn on top
      const oz = Math.max(W / 2 / (tanH * cam.aspect), H / 2 / tanH) * 1.04 + 1; { const fog0 = G.scene.fog; G.scene.fog = null; await look((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, oz); await shotP(`${id}_overview`); G.scene.fog = fog0; }
      const grp = new T.Group(), mk = (x0, y0, x1, y1, col, op) => { const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, y1 - y0), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: false, fog: false })); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 1.6); m.renderOrder = 50; grp.add(m); };
      for (const s of G.activeSolids()) if (!s.gone && s.x1 > B.x0 - 1 && s.x0 < B.x1 + 1) mk(s.x0, Math.max(s.y0, B.y0 - 1), s.x1, Math.min(s.y1, B.y1 + 2), s.oneway ? 0xffe000 : s.kind === 'gate' ? 0xff00ff : s.kind === 'crack' ? 0x00ffff : 0xff0000, 0.4);
      for (const k of ['spikes', 'lava', 'water']) for (const h of d[k] || []) mk(B.x0 + h.x, B.y0 + h.y, B.x0 + h.x + h.w, B.y0 + h.y + (h.h || 0.4), k === 'water' ? 0x0060ff : 0xff8000, 0.45);
      const fog = G.scene.fog; G.scene.fog = null; G.scene.add(grp); await frame(); await shotP(`${id}_overview_collision`); G.scene.remove(grp); G.scene.fog = fog;
      out.push(`${id}: ${n} views, ${d.w}x${d.h} screens, theme ${d.theme}`);
    }
    return out;
  }, { ids, bells: process.env.BELLS === 'all', maxv: +(process.env.MAXV || 6) });
  console.log(res.join('\n')); if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 20).join('\n'));
  await b.close();
})();
