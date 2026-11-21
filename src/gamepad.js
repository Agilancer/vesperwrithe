// Game controllers. Tuned for an Xbox pad on Windows (Chromium and Firefox read it through XInput / Windows.Gaming.Input)
// and for whatever an iPhone or iPad pairs (MFi, Backbone/Kishi, Xbox, DualSense/DualShock, Switch Pro): Safari hands
// every one of them over through GameController.framework in the W3C "standard" layout, so one map serves them all.
//
// What "feel" means here:
//  · Sampled on every animation frame, not only when the game steps: a tap that starts and ends inside a hit-stop or a
//    long frame still lands, because presses are latched until the game reads them (exactly like keyboard events).
//  · Left stick → 8 directions with a radial dead zone and hysteresis. The sectors lean horizontal: a sloppy run never
//    crouches (crouching plants the hero) and a slightly high swing never spends mana on an art; a deliberate push
//    down or up still reads at once.
//  · Spring-back filter: a stick let go from full tilt overshoots past centre for a frame or two. That ghost of the
//    opposite direction is dropped, so the hero never flicks round at the end of a run; a real flick (strong) passes.
//  · Analog triggers with their own press/release points (LT guard, RT dash); the bumpers do the same jobs.
//  · Menus: d-pad and stick auto-repeat, 320 ms then every 75 ms.
//  · Rumble mixed from overlapping pulses, with impulse-trigger rumble where the browser offers it. Only the pad in
//    use buzzes, and only while it is the device being played with.
//  · Whichever pad was touched last decides the button glyphs (Xbox, PlayStation, Nintendo, generic).
import { wantsTouch } from './touch.js';

// ------------------------------------------------------------------------------- device: kb / touch / pad
// The last thing the player touched decides the hints and whether the on-screen touch buttons show.
export const device = { kind: wantsTouch() ? 'touch' : 'kb', family: 'xbox', name: '' };
const watchers = new Set();
export const onDevice = fn => watchers.add(fn);
export function setDevice(kind, family, name) {
  if (kind === device.kind && (!family || family === device.family)) return;
  device.kind = kind; if (family) { device.family = family; device.name = name || ''; }
  const c = document.body.classList; c.toggle('pad', kind === 'pad');
  for (const f of ['xbox', 'ps', 'nin', 'generic']) c.toggle('pad-' + f, kind === 'pad' && device.family === f);
  for (const fn of watchers) try { fn(device); } catch (e) { console.error(e); }
}
// pick({ kb, touch, pad }) → the line for the device in hand
export const pick = o => o[device.kind] ?? o.kb;
addEventListener('keydown', e => { if (!e.repeat) setDevice('kb'); }, true);
addEventListener('pointerdown', e => setDevice(e.pointerType === 'mouse' ? 'kb' : 'touch'), true);

export function family(id = '') {
  const s = id.toLowerCase();
  if (/054c|dualsense|dualshock|playstation/.test(s)) return 'ps';
  if (/057e|nintendo|pro controller|joy-?con/.test(s)) return 'nin';
  if (/xbox|xinput|045e|microsoft|x-box/.test(s)) return 'xbox';
  return 'generic';
}

// ------------------------------------------------------------------------------- glyphs
// Hint strings carry tokens like {A} {RT} {MENU} {DOWN}; fmt() turns them into badges for the pad in hand.
// The tokens name standard-layout positions (Xbox letters), so {A} is "the bottom face button" on every pad.
const sv = (b, vb = '0 0 16 16') => `<svg viewBox="${vb}" aria-hidden="true">${b}</svg>`;
const PS_FACE = {
  A: sv('<path d="M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8" stroke="#8fb8ff" stroke-width="1.9" stroke-linecap="round"/>'),
  B: sv('<circle cx="8" cy="8" r="4.3" fill="none" stroke="#ff7474" stroke-width="1.8"/>'),
  X: sv('<rect x="4.1" y="4.1" width="7.8" height="7.8" fill="none" stroke="#f397dc" stroke-width="1.8"/>'),
  Y: sv('<path d="M8 3.5l4.6 8.1H3.4z" fill="none" stroke="#4fdcbc" stroke-width="1.8" stroke-linejoin="round"/>'),
};
const XB_FACE = { A: '#7cc84f', B: '#f05a4f', X: '#4aa3ff', Y: '#ffc935' };
const NIN_FACE = { A: 'B', B: 'A', X: 'Y', Y: 'X' }; // positional: Nintendo prints B on the bottom button
const SHOULDER = {
  xbox: { LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', LS: 'LS', RS: 'RS' },
  ps: { LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', LS: 'L3', RS: 'R3' },
  nin: { LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', LS: 'LS', RS: 'RS' },
};
const ICON_VIEW = sv('<rect x="2.6" y="3" width="7.4" height="6.2" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="6" y="6.8" width="7.4" height="6.2" rx="1.2" fill="#15121a" stroke="currentColor" stroke-width="1.4"/>');
const ICON_MENU = sv('<path d="M3.8 5h8.4M3.8 8h8.4M3.8 11h8.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>');
const ARM = { UP: 'M6.6 1.8h2.8v4.3H6.6z', DOWN: 'M6.6 9.9h2.8v4.3H6.6z', LEFT: 'M1.8 6.6h4.3v2.8H1.8z', RIGHT: 'M9.9 6.6h4.3v2.8H9.9z', ALL: 'M6.6 1.8h2.8v12.4H6.6zM1.8 6.6h12.4v2.8H1.8z' };
const dpad = lit => sv(`<path d="M6 1.2h4v4.8h4.8v4H10v4.8H6V10H1.2V6H6z" fill="#2a2430" stroke="#cfc6b2" stroke-width=".9" stroke-linejoin="round"/>${ARM[lit] ? `<path d="${ARM[lit]}" fill="#f4e7c4"/>` : ''}`);
export function glyph(n, fam = device.family) {
  const f = fam === 'ps' || fam === 'nin' ? fam : 'xbox';
  if (n in XB_FACE) {
    if (f === 'ps') return `<b class="pg ps">${PS_FACE[n]}</b>`;
    if (f === 'nin') return `<b class="pg">${NIN_FACE[n]}</b>`;
    return `<b class="pg" style="color:${XB_FACE[n]}">${n}</b>`;
  }
  if (n in SHOULDER.xbox) return `<b class="pg sh">${SHOULDER[f][n]}</b>`;
  if (n === 'MENU') return f === 'ps' ? '<b class="pg sh">OPTIONS</b>' : f === 'nin' ? '<b class="pg">+</b>' : `<b class="pg">${ICON_MENU}</b>`;
  if (n === 'VIEW') return f === 'ps' ? `<b class="pg sh">${/dualsense|0ce6|0df2/i.test(device.name) ? 'CREATE' : 'SHARE'}</b>` : f === 'nin' ? '<b class="pg">−</b>' : `<b class="pg">${ICON_VIEW}</b>`;
  if (n === 'STICK') return '<b class="pg st">L</b>';
  return `<b class="pg dp">${dpad(n === 'DPAD' ? 'ALL' : n)}</b>`; // UP DOWN LEFT RIGHT DPAD
}
const TOKEN = /\{(A|B|X|Y|LB|RB|LT|RT|LS|RS|VIEW|MENU|DPAD|UP|DOWN|LEFT|RIGHT|STICK)\}/g;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const fmt = text => esc(text).replace(TOKEN, (_, n) => glyph(n));

// ------------------------------------------------------------------------------- preferences
const PREF_KEY = 'vesperwrithe_pad';
export const prefs = (() => { try { return { rumble: 1, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch (e) { return { rumble: 1 }; } })();
export function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

// ------------------------------------------------------------------------------- tuning
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16, TOUCHPAD: 17 };
const DZ_ON = 0.3, DZ_OFF = 0.24;           // radial dead zone (engage / release): release sits at XInput's own 0.24, above where a worn stick comes to rest
const TRIG_ON = 0.3, TRIG_OFF = 0.18;       // analog triggers: a resting finger never dashes, a half pull always does
const H_ON = 64, H_OFF = 72;                // degrees off level that still count as left/right (wide: runs never stall)
const DN_ON = 38, DN_OFF = 30, DN_MAG = 0.5; // degrees below level before DOWN (crouch / slide / dive) engages
const UP_ON = 56, UP_OFF = 48, UP_MAG = 0.55; // UP is stricter still: UP + attack spends mana
const REBOUND_MS = 90, REBOUND_HOLD = 40, REBOUND_MAG = 0.75; // spring-back: an opposite twitch this soon after letting go, this weak, must persist this long
const REPEAT_DELAY = 320, REPEAT_RATE = 75;
const GAME = { [BTN.A]: 'jump', [BTN.X]: 'attack', [BTN.B]: 'heal', [BTN.Y]: 'use', [BTN.LB]: 'guard', [BTN.LT]: 'guard', [BTN.RB]: 'dash', [BTN.RT]: 'dash', [BTN.MENU]: 'pack', [BTN.VIEW]: 'map', [BTN.TOUCHPAD]: 'map' };
const MENU = { [BTN.A]: 'Enter', [BTN.B]: 'Escape', [BTN.X]: 'KeyS', [BTN.Y]: 'PadY', [BTN.LB]: 'PadLB', [BTN.RB]: 'PadRB', [BTN.RS]: 'PadRS' };
// rumble vocabulary: s = strong (low, heavy) motor, w = weak (high, crisp) motor, lt/rt = impulse triggers, ms, decay = fade out
const FEEL = {
  hit: { s: 0.1, w: 0.42, ms: 55 },
  crit: { s: 0.55, w: 0.85, ms: 120, decay: 1 },
  boss: { s: 0.3, w: 0.62, ms: 90 },
  hurt: { s: 0.8, w: 0.5, ms: 190, decay: 1 },
  block: { s: 0.25, w: 0.8, ms: 75, lt: 0.75 },
  death: { s: 1, w: 0.7, ms: 700, decay: 1 },
  land: { s: 0.32, w: 0.12, ms: 70 },
  dash: { s: 0, w: 0.24, ms: 55, rt: 0.4 },
  slide: { s: 0.1, w: 0.22, ms: 140, decay: 1 },
  quake: { s: 0.9, w: 0.55, ms: 420, decay: 1, grow: 1 }, // screen shakes: k = shake amount scales strength and length
  heal: { s: 0, w: 0.22, ms: 150, decay: 1 },
  loot: { s: 0.05, w: 0.32, ms: 90 },
  level: { s: 0.15, w: 0.45, ms: 380, decay: 1 },
  bell: { s: 0.32, w: 0.55, ms: 950, decay: 1 },
  test: { s: 0.45, w: 0.45, ms: 160, decay: 1 },
};
const clamp01 = v => Math.max(0, Math.min(1, v || 0));

// Drops the spring-back ghost: after a direction is let go, its opposite only counts if pushed hard or held a moment.
class Rebound {
  constructor() { this.out = 0; this.leftT = -1e9; this.leftDir = 0; this.candT = 0; }
  step(raw, mag, now) {
    if (raw === this.out) { this.candT = 0; return raw; }
    if (this.out !== 0) { this.leftT = now; this.leftDir = this.out; }
    if (raw !== 0 && raw === -this.leftDir && now - this.leftT < REBOUND_MS && mag < REBOUND_MAG) {
      if (!this.candT) this.candT = now;
      if (now - this.candT < REBOUND_HOLD) { this.out = 0; return 0; }
    }
    this.candT = 0; this.out = raw; return raw;
  }
}

// ------------------------------------------------------------------------------- pads
export class Pads {
  constructor() {
    this.per = new Map();             // gamepad.index → { prev: [pressed…] }
    this.edges = new Set();           // gameplay presses since the last read()
    this.menu = [];                   // menu key codes since the last read()
    this.x = 0; this.up = false; this.down = false; this.jump = false; this.guard = false;
    this.stick = { on: false, rx: 0, rv: 0 }; this.fx = new Rebound(); this.fv = new Rebound();
    this.mdir = ''; this.mnext = 0; this.wasUp = false; this.settle = false;
    this.activeIndex = -1; this.lastT = 0; this.pulses = []; this.sent = null; this.lock = null;
    this.onConnect = null; this.onLost = null;
    addEventListener('gamepadconnected', e => { this.settle = false; this.onConnect?.(e.gamepad); });
    addEventListener('gamepaddisconnected', e => {
      this.per.delete(e.gamepad.index);
      if (e.gamepad.index === this.activeIndex) { this.activeIndex = -1; this.pulses.length = 0; this.sent = null; }
      if (!this.list().some(g => g.index !== e.gamepad.index)) { this.release(); this.onLost?.(e.gamepad); }
    });
    // leaving the page: let go of everything, stop buzzing, and don't count buttons still held on return as new presses
    const away = () => { this.settle = true; this.release(); this.stopRumble(); };
    addEventListener('blur', away); addEventListener('focus', () => { this.settle = true; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { away(); this.wake(false); } else { this.settle = true; if (performance.now() - this.lastT < 60000) this.wake(true); } });
    // iOS Safari: controller input never resets the screen-dim timer, and a gamepad press may not count as a gesture,
    // so any real tap or key is a chance to take the wake lock again
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (device.kind === 'pad' || performance.now() - this.lastT < 5000) this.wake(true, true); }, true);
  }
  list() {
    let raw = []; try { raw = window.__fakePads || navigator.getGamepads?.() || []; } catch (e) {} // insecure pages (plain http on a LAN) have no gamepads
    const all = []; for (const g of raw) if (g && g.connected !== false) all.push(g);
    const std = all.filter(g => g.mapping === 'standard'); // wheels, flight sticks and the like report raw layouts: ignore them when a real pad is here
    return std.length ? std : all;
  }
  release() { this.x = 0; this.up = this.down = this.jump = this.guard = false; this.mdir = ''; this.stick = { on: false, rx: 0, rv: 0 }; this.fx = new Rebound(); this.fv = new Rebound(); }
  connected() { return this.list().length > 0; }

  sample() {
    const now = performance.now(), pads = this.list(), held = new Set(), down = new Set();
    let sx = 0, sy = 0, sm = 0, active = null;
    for (const g of pads) {
      let st = this.per.get(g.index); if (!st) this.per.set(g.index, st = { prev: [] });
      const cur = [];
      for (let i = 0; i < g.buttons.length; i++) {
        const b = g.buttons[i], v = typeof b === 'number' ? b : b?.value || 0;
        const on = i === BTN.LT || i === BTN.RT ? v > (st.prev[i] ? TRIG_OFF : TRIG_ON) : typeof b === 'number' ? b > 0.5 : !!(b?.pressed || v > 0.5);
        cur[i] = on; if (on) held.add(i);
        if (on && !st.prev[i]) { down.add(i); active = g; }
      }
      st.prev = cur;
      const lx = +g.axes[0] || 0, ly = +g.axes[1] || 0, m = Math.hypot(lx, ly);
      if (m > sm) { sm = m; sx = lx; sy = ly; }
      if (m > 0.5 || Math.hypot(+g.axes[2] || 0, +g.axes[3] || 0) > 0.6) active ||= g; // a push counts as picking the pad up, drift doesn't
    }
    if (this.settle) { this.settle = false; down.clear(); active = null; }

    // left stick → 8 directions, leaning horizontal
    const mag = Math.min(1, sm), nx = sm > 1e-6 ? sx / sm : 0, ny = sm > 1e-6 ? sy / sm : 0, S = this.stick;
    let rx = 0, rv = 0;
    S.on = mag > (S.on ? DZ_OFF : DZ_ON);
    if (S.on) {
      const elev = Math.atan2(-ny, Math.abs(nx)) * 180 / Math.PI; // +90 straight up, 0 level, −90 straight down
      if (Math.abs(elev) < (S.rx ? H_OFF : H_ON)) rx = Math.sign(nx);
      if (elev < -(S.rv === -1 ? DN_OFF : DN_ON) && mag > (S.rv === -1 ? DN_MAG - 0.1 : DN_MAG)) rv = -1;
      else if (elev > (S.rv === 1 ? UP_OFF : UP_ON) && mag > (S.rv === 1 ? UP_MAG - 0.1 : UP_MAG)) rv = 1;
    }
    S.rx = rx; S.rv = rv;
    const fx = this.fx.step(rx, mag, now), fv = this.fv.step(rv, mag, now);
    const dx = (held.has(BTN.RIGHT) ? 1 : 0) - (held.has(BTN.LEFT) ? 1 : 0), dv = (held.has(BTN.UP) ? 1 : 0) - (held.has(BTN.DOWN) ? 1 : 0);
    this.x = dx || fx; const v = dv || fv; this.up = v === 1; this.down = v === -1;
    this.jump = held.has(BTN.A); this.guard = held.has(BTN.LB) || held.has(BTN.LT);
    for (const i of down) { if (GAME[i]) this.edges.add(GAME[i]); if (MENU[i]) this.menu.push(MENU[i]); }
    if (this.up && !this.wasUp) this.edges.add('up'); this.wasUp = this.up;

    // menus: one of four directions, auto-repeating
    let md = dv === 1 ? 'ArrowUp' : dv === -1 ? 'ArrowDown' : dx === 1 ? 'ArrowRight' : dx === -1 ? 'ArrowLeft' : '';
    if (!md && mag > (this.mdir ? 0.35 : 0.5)) {
      const along = d => ({ ArrowUp: -ny, ArrowDown: ny, ArrowRight: nx, ArrowLeft: -nx }[d] || 0) * mag;
      md = this.mdir && along(this.mdir) > 0.3 && along(this.mdir) >= 0.55 * mag ? this.mdir // keep it through a wobble near the diagonal
        : Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 'ArrowRight' : 'ArrowLeft') : (ny > 0 ? 'ArrowDown' : 'ArrowUp');
    }
    if (md !== this.mdir) { this.mdir = md; if (md) { this.menu.push(md); this.mnext = now + REPEAT_DELAY; } }
    else if (md && now >= this.mnext) { this.menu.push(md); this.mnext = Math.max(this.mnext + REPEAT_RATE, now + REPEAT_RATE / 2); } // steady cadence, no burst after a stall
    if (this.menu.length > 16) this.menu.splice(0, this.menu.length - 16); // nobody reading (paused): don't hoard

    if (active) { this.activeIndex = active.index; this.lastT = now; setDevice('pad', family(active.id), active.id); this.wake(true); }
    if (this.lock && now - this.lastT > 180000) this.wake(false); // the pad has sat idle three minutes: let the screen sleep
    this.tickRumble(now);
  }
  // what the game reads once per step; presses latched since the last read are handed over and cleared
  read() {
    this.sample();
    const r = { x: this.x, up: this.up, down: this.down, jump: this.jump, guard: this.guard, edges: this.edges, menu: this.menu };
    this.edges = new Set(); this.menu = [];
    return r;
  }

  // ----------------------------------------------------------------------------- rumble
  pad() { return this.activeIndex < 0 ? null : this.list().find(g => g.index === this.activeIndex) || null; }
  canRumble() { const g = this.pad(); return !!(g?.vibrationActuator?.playEffect || g?.hapticActuators?.[0]?.pulse); }
  rumble(name, k = 1) {
    const f = FEEL[name]; if (!f || device.kind !== 'pad' || !prefs.rumble || this.activeIndex < 0) return;
    const now = performance.now(), a = Math.min(1.4, Math.max(0, k));
    this.pulses.push({ s: f.s * a, w: f.w * a, lt: (f.lt || 0) * a, rt: (f.rt || 0) * a, t0: now, end: now + f.ms * (f.grow ? Math.max(0.35, a) : 1), decay: f.decay });
    if (this.pulses.length > 12) this.pulses.shift();
    this.tickRumble(now); // start now: the hit-stop that usually follows must not delay the kick
  }
  tickRumble(now) {
    this.pulses = this.pulses.filter(p => p.end > now);
    if (!this.pulses.length) { this.sent = null; return; }
    let s = 0, w = 0, lt = 0, rt = 0, next = Infinity;
    for (const p of this.pulses) {
      const f = p.decay ? (p.end - now) / (p.end - p.t0) : 1;
      s = Math.max(s, p.s * f); w = Math.max(w, p.w * f); lt = Math.max(lt, p.lt * f); rt = Math.max(rt, p.rt * f);
      next = Math.min(next, p.decay ? now + 45 : p.end); // fades are stepped every 45 ms
    }
    const last = Math.max(...this.pulses.map(p => p.end)), o = this.sent, g = prefs.rumble;
    const moved = !o || Math.abs(o.s - s) > 0.05 || Math.abs(o.w - w) > 0.05 || Math.abs(o.lt - lt) > 0.05 || Math.abs(o.rt - rt) > 0.05;
    if (!moved && now < o.until - 6) return;
    const ms = Math.min(next, last) - now + (Math.min(next, last) < last ? 30 : 0); // overlap the next step so there is no gap
    this.send(s * g, w * g, lt * g, rt * g, ms);
    this.sent = { s, w, lt, rt, until: Math.min(next, last) };
  }
  send(s, w, lt, rt, ms) {
    const g = this.pad(); if (!g) return;
    const va = g.vibrationActuator, dur = Math.max(16, Math.min(5000, Math.round(ms)));
    try {
      if (va?.playEffect) {
        const trig = !!va.effects?.includes?.('trigger-rumble'), p = { startDelay: 0, duration: dur, strongMagnitude: clamp01(s), weakMagnitude: clamp01(w) };
        if (trig) { p.leftTrigger = clamp01(lt); p.rightTrigger = clamp01(rt); }
        va.playEffect(trig ? 'trigger-rumble' : 'dual-rumble', p)?.catch?.(() => {});
      } else g.hapticActuators?.[0]?.pulse?.(clamp01(Math.max(s, w)), dur)?.catch?.(() => {});
    } catch (e) {}
  }
  stopRumble() { this.pulses.length = 0; if (!this.sent) return; this.sent = null; try { this.pad()?.vibrationActuator?.reset?.()?.catch?.(() => {}); } catch (e) {} }

  // ----------------------------------------------------------------------------- screen wake lock
  // Playing on a pad means nobody touches the screen: without this an iPhone dims and locks mid-fight.
  async wake(on, gesture) {
    if (on === !!this.lock || this._waking) return;
    if (on && (!navigator.wakeLock || document.hidden || !document.body.classList.contains('playing') || (!gesture && performance.now() < (this._wakeRetry || 0)))) return;
    this._waking = true;
    try {
      if (on) { const l = await navigator.wakeLock.request('screen'); this.lock = l; l.addEventListener?.('release', () => { if (this.lock === l) this.lock = null; }); }
      else { const l = this.lock; this.lock = null; await l?.release(); }
    } catch (e) { this._wakeRetry = performance.now() + 8000; } // refused (no gesture yet): the next tap or key, or a later try, gets it
    this._waking = false;
  }
}
