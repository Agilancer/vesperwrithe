// Touch controls for phones/tablets. Buttons feed the same key sets the keyboard uses, so every
// system (movement, combat, inventory, map) works unchanged. Multi-touch: each finger is tracked on
// its own and can slide between d-pad directions or action buttons without lifting.

const LAYOUT = {
  pad: [
    { id: 'up', code: 'ArrowUp', label: '▲', title: 'Interact' },
    { id: 'left', code: 'ArrowLeft', label: '◀' },
    { id: 'right', code: 'ArrowRight', label: '▶' },
    { id: 'down', code: 'ArrowDown', label: '▼', title: 'Crouch' },
  ],
  // menu: what the button sends while the pack or map is open
  act: [
    { id: 'attack', code: 'KeyJ', menu: 'KeyS', label: 'ATK', alt: 'GEM' },
    { id: 'jump', code: 'Space', menu: 'Enter', label: 'JUMP', alt: 'OK' },
    { id: 'shield', code: 'KeyL', menu: 'Escape', label: 'GUARD', alt: 'BACK' },
    { id: 'dash', code: 'ShiftLeft', menu: 'Escape', label: 'DASH', alt: 'BACK' },
  ],
  top: [
    { id: 'potion', code: 'KeyQ', label: 'POTION' },
    { id: 'map', code: 'KeyM', label: 'MAP' },
    { id: 'pack', code: 'KeyI', label: 'PACK' },
  ],
};

export function wantsTouch() {
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '0') return false;
  return q === '1' || 'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
}

export function initTouch(input, menuOpen) {
  if (!wantsTouch()) return null;
  document.body.classList.add('touch');
  const root = document.createElement('div'); root.id = 'touch';
  const mk = (b, cls) => { const e = document.createElement('div'); e.className = 'tbtn ' + cls + ' t-' + b.id; e.dataset.id = b.id; e.innerHTML = `<span>${b.label}</span>`; e._b = b; return e; };
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

  // relabel the action buttons while a menu is open, so the player knows what they do there
  let wasMenu = null;
  const relabel = () => { const m = !!menuOpen(); if (m !== wasMenu) { wasMenu = m; act.querySelectorAll('.tbtn').forEach(el => el.querySelector('span').textContent = m && el._b.alt ? el._b.alt : el._b.label); root.classList.toggle('menu', m); } requestAnimationFrame(relabel); };
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
