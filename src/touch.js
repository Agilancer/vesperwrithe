// Touch controls for phones/tablets. Buttons feed the same key sets the keyboard uses, so every
// system (movement, combat, inventory, map) works unchanged. Multi-touch: each finger is tracked on
// its own and can slide between d-pad directions or action buttons without lifting.

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
const LAYOUT = {
  pad: [
    { id: 'up', code: 'ArrowUp', title: 'Interact' },
    { id: 'left', code: 'ArrowLeft' },
    { id: 'right', code: 'ArrowRight' },
    { id: 'down', code: 'ArrowDown', title: 'Crouch' },
  ],
  // menu: what the button sends while the pack or map is open
  act: [
    { id: 'attack', code: 'KeyJ', menu: 'KeyS', label: 'ATTACK', alt: 'GEM', icon: 'attack' },
    { id: 'jump', code: 'Space', menu: 'Enter', label: 'JUMP', alt: 'OK', icon: 'jump' },
    { id: 'shield', code: 'KeyL', menu: 'Escape', label: 'GUARD', alt: 'BACK', icon: 'shield' },
    { id: 'dash', code: 'ShiftLeft', menu: 'Escape', label: 'DASH', alt: 'BACK', icon: 'dash' },
    { id: 'use', code: 'KeyE', label: 'USE', icon: 'use' },
  ],
  top: [
    { id: 'potion', code: 'KeyQ', label: 'Potion', icon: 'potion' },
    { id: 'map', code: 'KeyM', label: 'Map', icon: 'map' },
    { id: 'pack', code: 'KeyI', label: 'Pack', icon: 'pack' },
  ],
};

export function wantsTouch() {
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '0') return false;
  return q === '1' || 'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
}

export function initTouch(input, menuOpen, ctxAction = () => '', potions = () => 0) {
  if (!wantsTouch()) return null;
  document.body.classList.add('touch');
  const root = document.createElement('div'); root.id = 'touch';
  const mk = (b, cls) => {
    const e = document.createElement('div'); e.className = 'tbtn ' + cls + ' t-' + b.id; e.dataset.id = b.id; e._b = b;
    e.innerHTML = cls === 'dir' ? '<i></i>' : `${b.icon ? ICON[b.icon] : ''}${b.label ? `<span>${b.label}</span>` : ''}${b.id === 'potion' ? '<em>0</em>' : ''}`;
    if (b.label) e.setAttribute('aria-label', b.label);
    return e;
  };
  const pad = document.createElement('div'); pad.className = 'tpad'; LAYOUT.pad.forEach(b => pad.appendChild(mk(b, 'dir')));
  const act = document.createElement('div'); act.className = 'tact'; LAYOUT.act.forEach(b => act.appendChild(mk(b, 'act')));
  const top = document.createElement('div'); top.className = 'ttop'; LAYOUT.top.forEach(b => top.appendChild(mk(b, 'sys')));
  const rot = document.createElement('div'); rot.id = 'rotate'; rot.innerHTML = '<div>⟲</div><p>Turn your phone sideways to play</p>';
  root.append(pad, act, top); document.body.append(root, rot);

  const fingers = new Map(); // pointerId -> { el, code }
  const press = (el) => {
    const b = el._b, code = menuOpen() && b.menu ? b.menu : b.code;
    if (!input.keys.has(code)) input.pressed.add(code);
    input.keys.add(code); el.classList.add('on');
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
    return code;
  };
  const release = (f) => { if (!f) return; input.keys.delete(f.code); f.el.classList.remove('on'); };
  const target = (x, y) => { const e = document.elementFromPoint(x, y); const t = e && e.closest('.tbtn'); return t && root.contains(t) ? t : null; };
  // the d-pad is forgiving: a finger anywhere in the pad's box picks the nearest direction
  const padDir = (x, y) => {
    const r = pad.getBoundingClientRect(); if (x < r.left - 30 || x > r.right + 30 || y < r.top - 30 || y > r.bottom + 30) return null;
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return null;
    const id = Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    return pad.querySelector('.t-' + id);
  };
  const pick = (e, startedOnPad) => startedOnPad ? padDir(e.clientX, e.clientY) : target(e.clientX, e.clientY);

  root.addEventListener('pointerdown', e => {
    e.preventDefault(); goFull();
    const onPad = pad.contains(e.target) || e.target === pad, el = pick(e, onPad); if (!el) return;
    try { root.setPointerCapture(e.pointerId); } catch (err) {}
    fingers.set(e.pointerId, { el, code: press(el), pad: onPad });
  });
  root.addEventListener('pointermove', e => {
    const f = fingers.get(e.pointerId); if (!f) return; e.preventDefault();
    const el = pick(e, f.pad); if (el === f.el) return;
    release(f); if (el) { f.el = el; f.code = press(el); } else fingers.delete(e.pointerId);
  });
  const up = e => { release(fingers.get(e.pointerId)); fingers.delete(e.pointerId); };
  root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('lostpointercapture', up);
  addEventListener('blur', () => { fingers.forEach(release); fingers.clear(); });
  // no long-press menus, text selection or double-tap zoom anywhere in the game
  for (const ev of ['contextmenu', 'selectstart']) addEventListener(ev, e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || root.contains(e.target)) e.preventDefault(); }, { passive: false });

  // relabel the action buttons while a menu is open, so the player knows what they do there; the USE button only
  // appears (with the right verb) when there is something to use; the potion button shows how many are left
  let wasMenu = null, wasCtx = null, wasPot = null;
  const useBtn = act.querySelector('.t-use'), potBadge = top.querySelector('.t-potion em');
  const relabel = () => {
    const m = !!menuOpen();
    if (m !== wasMenu) { wasMenu = m; act.querySelectorAll('.tbtn').forEach(el => { const sp = el.querySelector('span'); if (sp && el._b.alt) sp.textContent = m ? el._b.alt : el._b.label; }); root.classList.toggle('menu', m); }
    const c = m ? '' : ctxAction() || '';
    if (c !== wasCtx) { wasCtx = c; useBtn.classList.toggle('show', !!c); if (c) useBtn.querySelector('span').textContent = c; }
    const n = potions(); if (n !== wasPot) { wasPot = n; potBadge.textContent = n; top.querySelector('.t-potion').classList.toggle('empty', !n); }
    requestAnimationFrame(relabel);
  };
  relabel();

  let triedFull = false;
  function goFull() {
    if (triedFull) return; triedFull = true;
    const d = document.documentElement;
    try { (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d, { navigationUI: 'hide' })?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => {}); } catch (e) {}
  }
  document.getElementById('startBtn')?.addEventListener('click', goFull);
  return root;
}
