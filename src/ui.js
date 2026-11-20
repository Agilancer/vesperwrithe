import * as THREE from 'three';
import { BASES, GEMS, SLOTS, ECHOES, itemStats, itemHost, itemValue, makeItem, makeGem, randomBase, DROP_GEMS } from './items.js';
import { ROOMS, SW, SH, BELLS, BELL_ORDER } from './rooms.js';
import { audio } from './assets.js';

const $ = id => document.getElementById(id);
const v3 = new THREE.Vector3();
const hex = c => '#' + c.toString(16).padStart(6, '0');
const TABS = ['all', 'weapons', 'armor', 'gems'];
// map extents of the whole castle
let C0 = 1e9, C1 = -1e9, R0 = 1e9, R1 = -1e9; for (const r of ROOMS) { C0 = Math.min(C0, r.col); C1 = Math.max(C1, r.col + r.w); R0 = Math.min(R0, r.row); R1 = Math.max(R1, r.row + r.h); }

export class UI {
  constructor(game) { this.g = game; this.open = null; this.sel = 0; this.tab = 'all'; this.socketMode = null; this.menu = null; }

  dmg(x, y, n, cls = '') {
    v3.set(x, y, 0).project(this.g.camera);
    const el = document.createElement('div'); el.className = 'dmg ' + (cls || ''); el.textContent = n;
    el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 820);
  }
  toast(text, cls = '') { const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = text; $('toasts').appendChild(el); setTimeout(() => el.remove(), 3800); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); }
  prompt(text) { const p = $('prompt'); if (text) { p.textContent = text; p.classList.add('show'); } else p.classList.remove('show'); }
  roomName(name, hold = 2400) { const r = $('roomName'); r.textContent = name; r.classList.add('show'); clearTimeout(this._rn); this._rn = setTimeout(() => r.classList.remove('show'), hold); }
  bellGet(B) {
    const el = $('bellGet'); el.innerHTML = `<small>A BELL OF VELSCOUR RINGS AGAIN</small><h2 style="color:${hex(B.color)}">${B.name}</h2><b>${B.verb}</b><p>${B.how}</p>`;
    el.classList.add('show'); clearTimeout(this._bg); this._bg = setTimeout(() => el.classList.remove('show'), 7000);
  }
  bells() { const P = this.g.player; $('bells').innerHTML = BELL_ORDER.map(b => `<i title="${BELLS[b].name}" class="${P.has(b) ? 'on' : ''}" style="--c:${hex(BELLS[b].color)}"></i>`).join(''); }
  ending(text, rows) { const el = $('ending'); el.innerHTML = `<h1>VESPERWRITHE</h1><p>${text}</p><div class="stats">${rows.map(([k, v]) => `<span class="k">${k}</span><span>${v}</span>`).join('')}</div><p class="sub">Thank you for playing. Press Enter to walk the castle again.</p>`; el.classList.remove('hidden'); this.open = 'ending'; }

  hud() {
    const s = this.g.player.stats;
    $('hpFill').style.width = (100 * s.hp / s.hpMax) + '%'; $('hpText').textContent = `${Math.ceil(s.hp)} / ${s.hpMax}`;
    $('mpFill').style.width = (100 * s.mp / s.mpMax) + '%'; $('mpText').textContent = `${s.mp}`;
    $('xpFill').style.width = Math.min(100, 100 * s.xp / s.next) + '%';
    $('lvl').textContent = s.lvl; $('lvl').classList.toggle('pts', s.pts > 0);
    const g = `${s.gold} <small>GOLD</small> &nbsp; ${s.potions} <small>POTIONS (Q)</small>`; if (g !== this._g) { this._g = g; $('gold').innerHTML = g; }
    if ((this.g.frame || 0) % 3 === 0) this.minimap();
  }

  // ------------------------------------------------------------------ map
  drawMap(ctx, cw, ch, cell, cx, cy, big) {
    ctx.clearRect(0, 0, cw, ch);
    const cur = this.g.room?.def, p = this.g.player.pos, flags = this.g.flags;
    const pc = p.x / SW, pr = -(p.y / SH) + 1;
    const ox = cw / 2 - cx * cell, oy = ch / 2 - cy * cell;
    for (const r of ROOMS) {
      if (!this.g.visited.has(r.id)) continue;
      const x = ox + r.col * cell, y = oy + r.row * cell, w = r.w * cell, h = r.h * cell;
      if (x > cw || y > ch || x + w < 0 || y + h < 0) continue;
      ctx.fillStyle = r.save ? '#b8485c' : r.warp ? '#d9c48a' : r.shop ? '#58b98a' : r.secret ? '#8f78d8' : r.id === cur?.id ? '#4fb3aa' : '#1d4f55';
      ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.strokeStyle = 'rgba(214,246,240,.62)'; ctx.lineWidth = big ? 1.2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      for (const d of r.doors) { ctx.fillStyle = '#05050a'; const t = Math.max(2, cell * 0.3); if (d.side === 'W' || d.side === 'E') ctx.fillRect(d.side === 'W' ? x - 1 : x + w - 2, oy + d.row * cell + cell * 0.55, 3, t); else ctx.fillRect(ox + d.col * cell + cell * 0.35, d.side === 'N' ? y - 1 : y + h - 2, t, 3); }
      if (big && r.boss && !Object.keys(flags).some(k => k.startsWith('boss:' + r.id + ':'))) { ctx.fillStyle = '#ff5040'; ctx.font = `bold ${Math.max(9, cell * 0.7)}px Palatino Linotype, Georgia`; ctx.fillText('☠', x + w / 2 - cell * 0.3, y + h / 2 + cell * 0.25); }
      if (big && r.bell && !this.g.player.has(r.bell.id) && Object.keys(flags).some(k => k.startsWith('boss:' + r.id + ':'))) { ctx.fillStyle = hex(BELLS[r.bell.id].color); ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, cell * 0.3, 0, 7); ctx.fill(); }
    }
    if ((performance.now() / 300 | 0) % 2) { ctx.fillStyle = '#fff'; const s = big ? 5 : 4; ctx.fillRect(ox + pc * cell - s / 2, oy + (pr - 1 + 0.7) * cell - s / 2, s, s); }
  }
  minimap() { const c = $('minimap'), p = this.g.player.pos; this.drawMap(c.getContext('2d'), c.width, c.height, 12, p.x / SW, -(p.y / SH) + 0.5, false); }
  bigmap() {
    const c = $('bigmap'), ctx = c.getContext('2d'), cell = Math.floor(Math.min((c.width - 40) / (C1 - C0), (c.height - 40) / (R1 - R0)));
    this.drawMap(ctx, c.width, c.height, cell, (C0 + C1) / 2, (R0 + R1) / 2, true);
    // no opaque backing: the themed chart paper (grid + vignette) behind the canvas shows through
    const pct = Math.round(100 * this.g.visited.size / ROOMS.length), cur = this.g.room?.def;
    $('mapHint').innerHTML = `M close · Castle Velscour — ${cur ? cur.name : ''} · explored ${pct}% (${this.g.visited.size}/${ROOMS.length} chambers) · <span style="color:#e06a7a">■</span> save <span style="color:#c9a23a">■</span> mirror <span style="color:#3aa06a">■</span> librarian <span style="color:#9a6ae0">■</span> secret`;
  }

  // ------------------------------------------------------------------ menus
  toggle(name) {
    const el = { inv: $('inv'), map: $('mapScreen'), menu: $('menu') };
    if (this.open === 'ending') return;
    if (this.open === name || (this.open === 'menu' && name !== 'menu')) { el[this.open].classList.add('hidden'); const was = this.open; this.open = null; this.menu = null; audio.play(was === 'map' ? 'map_close' : 'book_close', 0.4); if (was !== name) return; return; }
    if (this.open) el[this.open].classList.add('hidden');
    this.open = name; el[name].classList.remove('hidden'); audio.play(name === 'map' ? 'map_open' : 'book_open', 0.4);
    if (name === 'inv') { this.sel = 0; this.socketMode = null; this.renderInv(); } else if (name === 'map') this.bigmap();
  }
  menuKey(code) {
    if (this.open === 'ending') { if (code === 'Enter') location.reload(); return; }
    if (this.open === 'inv') { if (code === 'Escape' && !this.socketMode) return this.toggle('inv'); return this.invKey(code); }
    if (this.open === 'map') { if (code === 'Escape') this.toggle('map'); return; }
    if (this.open === 'menu') return this.listKey(code);
  }
  packItems() {
    const b = this.g.player.bag;
    const f = { all: () => true, weapons: i => i.base && BASES[i.base].slot === 'weapon', armor: i => i.base && BASES[i.base].slot !== 'weapon', gems: i => !!i.gem }[this.tab];
    const order = { unique: 0, rare: 1, magic: 2, normal: 3, gem: 4 };
    return b.filter(f).sort((a, c) => (order[a.rarity] - order[c.rarity]) || ((BASES[c.base]?.lvl || 0) - (BASES[a.base]?.lvl || 0)));
  }
  invKey(code) {
    const P = this.g.player, s = P.stats;
    if (this.socketMode) {
      const targets = this.socketTargets();
      if (code === 'ArrowDown') this.sel = (this.sel + 1) % Math.max(1, targets.length);
      else if (code === 'ArrowUp') this.sel = (this.sel - 1 + targets.length) % Math.max(1, targets.length);
      else if (code === 'Enter' || code === 'KeyS') { const t = targets[this.sel]; if (t) this.insertGem(this.socketMode, t); }
      else if (code === 'Escape' || code === 'Backspace') { this.socketMode = null; this.sel = 0; }
      return this.renderInv();
    }
    const list = this.packItems(), stat = { Digit1: 'str', Digit2: 'con', Digit3: 'int', Digit4: 'lck' }[code];
    if (stat && s.pts > 0) { s[stat]++; s.pts--; P.refreshStats(); audio.play('ui_confirm', 0.4); }
    else if (code === 'ArrowDown') this.sel = Math.min(list.length - 1, this.sel + 1);
    else if (code === 'ArrowUp') this.sel = Math.max(0, this.sel - 1);
    else if (code === 'ArrowRight' || code === 'ArrowLeft') { this.tab = TABS[(TABS.indexOf(this.tab) + (code === 'ArrowRight' ? 1 : 3)) % 4]; this.sel = 0; audio.play('ui_pointer', 0.3); }
    else if (code === 'Enter' || code === 'KeyE') { const it = list[this.sel]; if (it?.base) this.equipFromPack(it); }
    else if (code === 'KeyS') { const it = list[this.sel]; if (it?.gem) { this.socketMode = it; this.sel = 0; audio.play('ui_popup', 0.4); } }
    else if (code === 'KeyU') { const sl = SLOTS[(this._un = ((this._un ?? -1) + 1) % SLOTS.length)]; if (P.equip[sl.id]) P.equipItem(sl.id, null).then(() => this.renderInv()); }
    this.renderInv();
  }
  async equipFromPack(it) {
    const base = BASES[it.base]; let slot = base.slot;
    if (slot === 'ring') slot = !this.g.player.equip.ring1 ? 'ring1' : 'ring2';
    await this.g.player.equipItem(slot, it);
    this.toast(`Equipped ${it.name}`, it.rarity); this.g.onEquip?.(it); this.renderInv();
  }
  socketTargets() { const P = this.g.player, all = [...Object.values(P.equip).filter(Boolean), ...P.bag.filter(i => i.base)]; return all.filter(i => i.sockets > i.gems.length); }
  async insertGem(gem, item) {
    const P = this.g.player; item.gems.push(gem.gem); P.bag = P.bag.filter(i => i !== gem);
    audio.play('gem_collect', 0.6); this.toast(`${GEMS[gem.gem].name} set into ${item.name}`, 'gem');
    for (const [slot, it] of Object.entries(P.equip)) if (it === item) await P.attachVisual(slot);
    P.refreshStats(); this.socketMode = null; this.sel = 0; this.g.onEquip?.(item); this.renderInv();
    if (P.equip.weapon === item && GEMS[gem.gem].weapon.elem) { this.toggle('inv'); this.g.ignite(GEMS[gem.gem].weapon.elem); }
  }
  icon(it) {
    if (it.gem) return `<i class="ico gem" style="background:radial-gradient(circle at 35% 35%,#fff,${GEMS[it.gem].css} 45%,#000)"></i>`;
    const b = BASES[it.base], n = b.icon || b.model;
    return n ? `<img class="ico" src="assets/game/items/icons/${n}.webp" onerror="this.style.visibility='hidden'">` : `<i class="ico ring"></i>`;
  }
  renderInv() {
    const P = this.g.player, s = P.stats; P.refreshStats(); const d = P.d, pt = s.pts > 0;
    const row = (k, v, key) => `<span class="k">${k}${key && pt ? ` <kbd>${key}</kbd>` : ''}</span><span>${v}</span>`;
    $('stats').innerHTML = [row('Level', s.lvl), row('Experience', `${s.xp} / ${s.next}`), row('Life', `${Math.ceil(s.hp)} / ${s.hpMax}`), row('Mana', `${s.mp} / ${s.mpMax}`),
      row('Strength', d.str, 1), row('Constitution', d.con, 2), row('Intellect', d.int, 3), row('Luck', d.lck, 4), row('Agility', d.dex),
      row('Attack', `${d.dmg[0]}-${d.dmg[1]}` + d.elems.map(e => ` <em class="e-${e.elem}">+${e.dmg[0]}-${e.dmg[1]}</em>`).join('')), row('Critical', `${Math.round(d.crit)}%`), row('Attack speed', `+${Math.round(Math.min(120, d.ias))}%`), row('Defense', d.def), row('Magic find', `+${Math.round(d.mf)}%`), row('Gold', s.gold)].join('')
      + (pt ? `<div class="pts">${s.pts} attribute point${s.pts > 1 ? 's' : ''} — press 1 · 2 · 3 · 4</div>` : '');
    $('slots').innerHTML = SLOTS.map(sl => { const it = P.equip[sl.id]; return `<div class="slot"><span class="n">${sl.label}</span><span class="q-${it?.rarity || 'normal'}">${it ? it.name + sockDots(it) : '—'}</span></div>`; }).join('')
      + `<div class="bellrow">${BELL_ORDER.map(b => `<span class="${P.has(b) ? 'on' : ''}" style="--c:${hex(BELLS[b].color)}">${P.has(b) ? BELLS[b].verb : '· · ·'}</span>`).join('')}</div>`;
    $('tabs').innerHTML = TABS.map(t => `<span class="${t === this.tab ? 'on' : ''}">${t.toUpperCase()}</span>`).join('');
    let list, detailItem;
    if (this.socketMode) {
      list = this.socketTargets();
      $('packList').innerHTML = `<li style="opacity:.7;pointer-events:none">Set the ${GEMS[this.socketMode.gem].name} into…</li>` + (list.length ? list.map((it, i) => `<li class="${i === this.sel ? 'sel' : ''} q-${it.rarity}">${this.icon(it)}${it.name}${sockDots(it)}<small>${Object.values(P.equip).includes(it) ? 'equipped' : ''}</small></li>`).join('') : '<li>No item has an open socket.</li>');
      detailItem = list[this.sel];
    } else {
      list = this.packItems(); this.sel = Math.min(this.sel, Math.max(0, list.length - 1));
      $('packList').innerHTML = list.length ? list.map((it, i) => `<li class="${i === this.sel ? 'sel' : ''} q-${it.rarity}">${this.icon(it)}${it.name}${it.base ? sockDots(it) : ''}<small>${it.gem ? 'gem' : BASES[it.base].cls || BASES[it.base].slot}</small></li>`).join('') : '<li style="opacity:.5">Your pack is empty.</li>';
      detailItem = list[this.sel];
    }
    $('packList').querySelectorAll('li').forEach((li, i) => li.onclick = () => { const off = this.socketMode ? 1 : 0; if (i - off < 0) return; if (this.sel === i - off) this.invKey('Enter'); else { this.sel = i - off; this.renderInv(); } });
    $('packList').querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    $('tabs').querySelectorAll('span').forEach((sp, i) => sp.onclick = () => { this.tab = TABS[i]; this.sel = 0; this.renderInv(); });
    $('detail').innerHTML = detailItem ? this.describe(detailItem, true) : '';
  }
  describe(it, compare) {
    if (it.gem) { const G = GEMS[it.gem]; return `<h3 class="q-gem">${G.name}</h3><div class="type">Gem — socket into gear (S)</div><div class="line"><b>Weapon:</b> ${G.weapon.text}</div><div class="line"><b>Armor:</b> ${G.armor.text}</div><div class="line"><b>Shield:</b> ${G.shield.text}</div><div class="act">[S] Socket into an item</div>`; }
    const b = BASES[it.base], st = itemStats(it), P = this.g.player;
    let h = `<h3 class="q-${it.rarity}">${it.name}</h3><div class="type">${it.rarity !== 'normal' ? it.rarity[0].toUpperCase() + it.rarity.slice(1) + ' ' : ''}${b.cls || b.name}${b.hands === 2 ? ' · Two-Handed' : ''} · item level ${b.lvl}</div>`;
    const cur = compare && (b.slot === 'ring' ? P.equip.ring1 : P.equip[b.slot]), cs = cur && cur !== it ? itemStats(cur) : null;
    const diff = (a, c) => cs ? (a > c ? ` <em class="up">▲${a - c}</em>` : a < c ? ` <em class="dn">▼${c - a}</em>` : '') : '';
    if (st.dmg) h += `<div class="line">Damage: ${st.dmg[0]}-${st.dmg[1]}${diff(Math.round((st.dmg[0] + st.dmg[1]) / 2), cs?.dmg ? Math.round((cs.dmg[0] + cs.dmg[1]) / 2) : 0)}</div>`;
    if (b.def) h += `<div class="line">Defense: ${st.def}${diff(st.def, cs?.def || 0)}</div>`; if (b.block) h += `<div class="line">Block: ${Math.round(b.block * 100)}%</div>`;
    for (const l of st.lines) h += `<div class="line ${l.cls}" ${l.css ? `style="color:${l.css}"` : ''}>${l.text}</div>`;
    if (it.sockets) h += `<div class="sockets">${Array.from({ length: it.sockets }, (_, i) => { const g = it.gems[i]; return `<span class="sock" style="${g ? `background:radial-gradient(circle at 35% 35%,#fff,${GEMS[g].css} 45%,#000);border-color:${GEMS[g].css}` : ''}"></span>`; }).join('')}</div>`;
    h += `<div class="act">${this.socketMode ? '[Enter] Socket here · [Esc] cancel' : compare ? '[Enter] Equip · [U] unequip a slot · worth ' + Math.round(itemValue(it) * 0.3) + 'g' : ''}</div>`;
    return h;
  }

  // ------------------------------------------------------------------ warp mirror / librarian
  openMenu(kind, data) {
    const P = this.g.player, s = P.stats;
    if (kind === 'warp') this.menu = { kind, title: 'The Mirror of Passage', hint: 'Enter step through · Esc close', rows: data.map(r => ({ label: r.def.name, sub: `Area ${r.def.area}`, act: () => { this.toggle('menu'); this.g.warpTo(r.def.id); } })) };
    else {
      const lvl = Math.max(2, s.lvl), stock = this._stock?.lvl === lvl ? this._stock.items : (this._stock = { lvl, items: [...Array.from({ length: 5 }, () => makeItem(randomBase(lvl + 1), { rarity: Math.random() < 0.3 ? 'rare' : 'magic', lvl: lvl + 1 })), ...Array.from({ length: 3 }, () => makeGem(DROP_GEMS[Math.random() * DROP_GEMS.length | 0]))] }).items;
      const rows = [{ label: 'Potion of Vigor', sub: `${40 + lvl * 6}g`, cost: 40 + lvl * 6, act: r => { s.potions++; return true; }, keep: true }];
      for (const it of stock) rows.push({ label: it.name, cls: 'q-' + it.rarity, sub: itemValue(it) + 'g', cost: itemValue(it), item: it, act: r => { P.bag.push(it); stock.splice(stock.indexOf(it), 1); return true; } });
      for (const it of P.bag) rows.push({ label: 'Sell: ' + it.name, cls: 'q-' + it.rarity, sub: '+' + Math.round(itemValue(it) * 0.3) + 'g', item: it, sell: true, act: r => { s.gold += Math.round(itemValue(it) * 0.3); P.bag = P.bag.filter(x => x !== it); audio.play('coins_gather_quick', 0.5); return true; } });
      this.menu = { kind, title: 'The Librarian', hint: 'Enter buy / sell · Esc close · “Knowledge is the only door that opens inward.”', rows };
    }
    this.sel = Math.min(this.sel, this.menu.rows.length - 1); if (this.open !== 'menu') { this.sel = 0; this.toggle('menu'); } this.renderMenu();
  }
  listKey(code) {
    const m = this.menu, s = this.g.player.stats; if (!m) return;
    if (code === 'Escape') return this.toggle('menu');
    if (code === 'ArrowDown') this.sel = Math.min(m.rows.length - 1, this.sel + 1); else if (code === 'ArrowUp') this.sel = Math.max(0, this.sel - 1);
    else if (code === 'Enter' || code === 'KeyE') { const r = m.rows[this.sel]; if (!r) return; if (r.cost && s.gold < r.cost) { audio.play('ui_cancel', 0.4); this.toast('Not enough gold.', ''); return; } if (r.cost) { s.gold -= r.cost; audio.play('coin_collect', 0.5); } r.act(r); if (m.kind === 'shop') return this.openMenu('shop'); return; }
    this.renderMenu();
  }
  renderMenu() {
    const m = this.menu, s = this.g.player.stats;
    $('menuTitle').textContent = m.title; $('menuHint').textContent = m.hint + (m.kind === 'shop' ? `  ·  You have ${s.gold} gold` : '');
    $('menuList').innerHTML = m.rows.map((r, i) => `<li class="${i === this.sel ? 'sel' : ''} ${r.cls || ''}">${r.item ? this.icon(r.item) : ''}${r.label}<small>${r.sub || ''}</small></li>`).join('');
    $('menuList').querySelectorAll('li').forEach((li, i) => li.onclick = () => { if (this.sel === i) this.listKey('Enter'); else { this.sel = i; this.renderMenu(); } });
    $('menuList').querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    const r = m.rows[this.sel]; $('menuDetail').innerHTML = r?.item ? this.describe(r.item, !r.sell) : '';
  }
}
function sockDots(it) { return it.sockets ? ` <small>[${it.gems.length}/${it.sockets}]</small>` : ''; }
