// Touch controls for phones/tablets. Buttons feed the same key sets the keyboard uses, so every system (movement,
// combat, inventory, map) works unchanged. Multi-touch: each finger is tracked on its own.
//   Left half: a floating thumbstick — it appears where the thumb lands, 8 directions with a dead zone
//     (left/right run, pull down to crouch, push up to interact), and it never drops a drifting thumb.
//   Right: the action arc (JUMP and ATTACK big on the thumb's rest line, GUARD and DASH one reach up, a quick-heal
//     potion above DASH, USE pops in when there's something to use). A thumb that slides off a button keeps
//     tracking and presses whatever it slides onto.
//   Top: MAP and PACK.

// Icons are inline SVG: unicode arrows (◀ ▶) render as blue emoji boxes on iPhone.
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  jump: svg('M12 3 4 11h5v3h6v-3h5zM9 16h6v2H9zM9 19.5h6V21H9z'),
  attack: svg('M20.5 2.5 21.5 3.5 10 15l2 2-1.5 1.5-1.8-1.8L5.4 20 4 18.6l3.3-3.3-1.8-1.8L7 12l2 2z'),
  shield: svg('M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5zm0 2.2 6 2.3V11c0 3.9-2.5 7.4-6 8.8z'),
  dash: svg('M3 6l6 6-6 6V6zm8 0 6 6-6 6V6zm7 0h2v12h-2z'),
  use: svg('M12 2a1 1 0 0 1 1 1v6.1l5.2-3a1 1 0 1 1 1 1.7L14 10.9l5.2 3a1 1 0 1 1-1 1.7l-5.2-3V19a1 1 0 1 1-2 0v-6.4l-5.2 3a1 1 0 1 1-1-1.7l5.2-3-5.2-3a1 1 0 1 1 1-1.7l5.2 3V3a1 1 0 0 1 1-1z'),
  potion: svg('M9 2h6v2h-1v4.2l4.6 7.6A3.5 3.5 0 0 1 15.6 21H8.4a3.5 3.5 0 0 1-3-5.2L10 8.2V4H9zm-1.4 15h8.8l-2.5-4H10.1z'),
  map: svg('M9 3 3 5.5v15.5l6-2.5 6 2.5 6-2.5V3l-6 2.5zm1 2.4 4 1.7v11.5l-4-1.7z'),
  pack: svg('M9 3h6l1 3h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2zm1.3 1.5L9.8 6h4.4l-.5-1.5zM8 11v2h8v-2z'),
};
// menu: what the button sends while the pack or map is open; alt: its label there
const ACT = [
  { id: 'attack', code: 'KeyJ', menu: 'KeyS', label: 'ATTACK', alt: 'GEM', icon: 'attack' },
  { id: 'jump', code: 'Space', menu: 'Enter', label: 'JUMP', alt: 'OK', icon: 'jump' },
  { id: 'shield', code: 'KeyL', menu: 'Escape', label: 'GUARD', alt: 'BACK', icon: 'shield' },
  { id: 'dash', code: 'ShiftLeft', menu: 'Escape', label: 'DASH', alt: 'BACK', icon: 'dash' },
  { id: 'potion', code: 'KeyQ', label: 'HEAL', icon: 'potion' },
  { id: 'use', code: 'KeyE', label: 'USE', icon: 'use' },
];
const TOP = [
  { id: 'map', code: 'KeyM', label: 'Map', icon: 'map' },
  { id: 'pack', code: 'KeyI', label: 'Pack', icon: 'pack' },
];

export function wantsTouch() {
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '0') return false;
  return q === '1' || 'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
}

// hud(): { menu, ctx, potions, canDouble } read every frame
export function initTouch(input, hud) {
  if (!wantsTouch()) return null;
  document.body.classList.add('touch');
  const root = document.createElement('div'); root.id = 'touch';
  const mk = (b, cls) => {
    const e = document.createElement('div'); e.className = 'tbtn ' + cls + ' t-' + b.id; e.dataset.id = b.id; e._b = b;
    e.innerHTML = `${ICON[b.icon]}${cls === 'act' ? `<span>${b.label}</span>` : ''}${b.id === 'potion' ? '<em>0</em>' : ''}${b.id === 'jump' ? '<b class="x2">×2</b>' : ''}`;
    e.setAttribute('aria-label', b.label);
    return e;
  };
  const stickZone = document.createElement('div'); stickZone.className = 'tstick-zone';
  const stick = document.createElement('div'); stick.className = 'tstick'; stick.innerHTML = '<i class="ring"></i><i class="knob"></i>';
  stickZone.appendChild(stick);
  const act = document.createElement('div'); act.className = 'tact'; ACT.forEach(b => act.appendChild(mk(b, 'act')));
  const top = document.createElement('div'); top.className = 'ttop'; TOP.forEach(b => top.appendChild(mk(b, 'sys')));
  const rot = document.createElement('div'); rot.id = 'rotate'; rot.innerHTML = '<div>⟲</div><p>Turn your phone sideways to play</p>';
  root.append(stickZone, act, top); document.body.append(root, rot);
  const buzz = ms => { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

  // ---- buttons
  const fingers = new Map(); // pointerId -> { el, code } for buttons, { stick: true, ... } for the stick
  const press = (el) => {
    const b = el._b, code = hud().menu && b.menu ? b.menu : b.code;
    if (!input.keys.has(code)) input.pressed.add(code);
    input.keys.add(code); el.classList.add('on'); buzz(8);
    return code;
  };
  const release = f => { if (f?.el) { input.keys.delete(f.code); f.el.classList.remove('on'); f.el = null; } };
  const target = (x, y) => { const e = document.elementFromPoint(x, y); const t = e && e.closest('.tbtn'); return t && root.contains(t) && !t.classList.contains('hidden-btn') ? t : null; };

  // ---- stick: rests bottom-left; a touch anywhere in the left zone re-centres it under the thumb
  const R = () => Math.min(innerHeight * 0.16, 64), DEAD = 0.28;
  const stickKeys = { ArrowLeft: false, ArrowRight: false, ArrowDown: false, ArrowUp: false };
  const setStickKey = (code, on) => {
    if (stickKeys[code] === on) return; stickKeys[code] = on;
    if (on) { if (!input.keys.has(code)) input.pressed.add(code); input.keys.add(code); } else input.keys.delete(code);
  };
  const moveStick = (f, x, y) => {
    const r = R(); let dx = x - f.cx, dy = y - f.cy; const d = Math.hypot(dx, dy);
    if (d > r * 1.6) { f.cx = x - dx / d * r * 1.6; f.cy = y - dy / d * r * 1.6; dx = x - f.cx; dy = y - f.cy; } // drag the base along: never lose the thumb
    const m = Math.min(1, Math.hypot(dx, dy) / r), a = Math.atan2(-dy, dx); // up = +
    const on = m > DEAD, sector = Math.round(a / (Math.PI / 4)); // 8 directions
    setStickKey('ArrowRight', on && [-1, 0, 1].includes(sector));
    setStickKey('ArrowLeft', on && [3, 4, -4, -3].includes(sector));
    setStickKey('ArrowDown', on && [-1, -2, -3].includes(sector) && m > 0.45);
    setStickKey('ArrowUp', on && sector === 2 && m > 0.6);
    const k = Math.min(1, Math.hypot(dx, dy) / r);
    const kx = dx / (Math.hypot(dx, dy) || 1) * k * r, ky = dy / (Math.hypot(dx, dy) || 1) * k * r;
    stick.style.transform = `translate(${f.cx}px, ${f.cy}px)`;
    stick.querySelector('.knob').style.transform = `translate(${kx}px, ${ky}px)`;
    stick.classList.toggle('on', on);
  };
  const restStick = () => {
    for (const c of Object.keys(stickKeys)) setStickKey(c, false);
    stick.classList.remove('active', 'on'); stick.style.transform = ''; stick.querySelector('.knob').style.transform = '';
  };

  root.addEventListener('pointerdown', e => {
    e.preventDefault(); goFull();
    try { root.setPointerCapture(e.pointerId); } catch (err) {}
    if (stickZone.contains(e.target) && !hud().menu) {
      const zr = stickZone.getBoundingClientRect(), f = { stick: true, cx: e.clientX - zr.left, cy: e.clientY - zr.top, zr };
      fingers.set(e.pointerId, f); stick.classList.add('active'); moveStick(f, f.cx, f.cy); return;
    }
    const el = target(e.clientX, e.clientY);
    fingers.set(e.pointerId, { el: null, code: null });
    if (el) { const f = fingers.get(e.pointerId); f.el = el; f.code = press(el); }
  });
  root.addEventListener('pointermove', e => {
    const f = fingers.get(e.pointerId); if (!f) return; e.preventDefault();
    if (f.stick) { moveStick(f, e.clientX - f.zr.left, e.clientY - f.zr.top); return; }
    const el = target(e.clientX, e.clientY); if (el === f.el) return;
    release(f); if (el) { f.el = el; f.code = press(el); } // slid onto another button (or back onto one): press it
  });
  const up = e => { const f = fingers.get(e.pointerId); if (!f) return; if (f.stick) restStick(); else release(f); fingers.delete(e.pointerId); };
  root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('lostpointercapture', up);
  addEventListener('blur', () => { fingers.forEach(f => f.stick ? restStick() : release(f)); fingers.clear(); });
  // no long-press menus, text selection or double-tap zoom anywhere in the game
  for (const ev of ['contextmenu', 'selectstart']) addEventListener(ev, e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || root.contains(e.target)) e.preventDefault(); }, { passive: false });

  // per-frame: menu relabels, the USE verb, potion count, the double-jump hint
  let was = {};
  const useBtn = act.querySelector('.t-use'), pot = act.querySelector('.t-potion'), jump = act.querySelector('.t-jump');
  const tick = () => {
    const h = hud(), m = !!h.menu;
    if (m !== was.m) { was.m = m; act.querySelectorAll('.tbtn').forEach(el => { const sp = el.querySelector('span'); if (sp && el._b.alt) sp.textContent = m ? el._b.alt : el._b.label; }); root.classList.toggle('menu', m); }
    const c = m ? '' : h.ctx || '';
    if (c !== was.c) { was.c = c; useBtn.classList.toggle('show', !!c); if (c) useBtn.querySelector('span').textContent = c; }
    if (h.potions !== was.p) { was.p = h.potions; pot.querySelector('em').textContent = h.potions; pot.classList.toggle('empty', !h.potions); }
    const d = !m && !!h.canDouble; if (d !== was.d) { was.d = d; jump.classList.toggle('double', d); }
    requestAnimationFrame(tick);
  };
  tick();

  let triedFull = false;
  function goFull() {
    if (triedFull) return; triedFull = true;
    const d = document.documentElement;
    try { (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d, { navigationUI: 'hide' })?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => {}); } catch (e) {}
  }
  document.getElementById('startBtn')?.addEventListener('click', goFull);
  return { buzz };
}
