import * as THREE from 'three';
import { BASES, GEMS, SLOTS, itemStats, itemHost } from './items.js';
import { ROOMS, SW, SH } from './rooms.js';
import { audio } from './assets.js';

const $ = id => document.getElementById(id);
const v3 = new THREE.Vector3();

export class UI {
  constructor(game) {
    this.g = game; this.open = null; this.sel = 0; this.tab = 'all'; this.focus = 'pack'; this.socketMode = null;
  }

  dmg(x, y, n, cls = '') {
    v3.set(x, y, 0).project(this.g.camera);
    const el = document.createElement('div'); el.className = 'dmg ' + cls; el.textContent = n;
    el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 820);
  }
  toast(text, cls = '') { const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = text; $('toasts').appendChild(el); setTimeout(() => el.remove(), 3800); }
  prompt(text) { const p = $('prompt'); if (text) { p.textContent = text; p.classList.add('show'); } else p.classList.remove('show'); }
  roomName(name, hold = 2400) { const r = $('roomName'); r.textContent = name; r.classList.add('show'); clearTimeout(this._rn); this._rn = setTimeout(() => r.classList.remove('show'), hold); }

  hud() {
    const s = this.g.player.stats;
    $('hpFill').style.width = (100 * s.hp / s.hpMax) + '%'; $('hpText').textContent = `${Math.ceil(s.hp)} / ${s.hpMax}`;
    $('mpFill').style.width = (100 * s.mp / s.mpMax) + '%'; $('mpText').textContent = `${s.mp}`;
    $('lvl').textContent = s.lvl; $('gold').innerHTML = `${s.gold} <small>GOLD</small> &nbsp; ${s.potions} <small>POTIONS${document.body.classList.contains('touch') ? '' : ' (Q)'}</small>`;
    this.minimap();
  }

  // ------------------------------------------------------------------ map
  drawMap(ctx, cw, ch, cell, cx, cy, full) {
    ctx.clearRect(0, 0, cw, ch);
    const cur = this.g.room?.def, p = this.g.player.pos;
    const pc = p.x / SW, pr = -(p.y / SH) + 1; // fractional map col/row (rows grow down)
    const ox = cw / 2 - cx * cell, oy = ch / 2 - cy * cell;
    for (const r of ROOMS) {
      const seen = this.g.visited.has(r.id); if (!seen && !full) continue;
      const x = ox + r.col * cell, y = oy + r.row * cell, w = r.w * cell, h = r.h * cell;
      ctx.fillStyle = !seen ? 'rgba(60,60,90,.25)' : r.save ? '#b5243a' : r.warp ? '#c9a23a' : r.id === cur?.id ? '#3b47c9' : '#2a33a6';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.strokeStyle = 'rgba(220,220,240,.75)'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (full && seen) { ctx.fillStyle = 'rgba(233,224,204,.85)'; ctx.font = `${Math.max(9, cell * 0.22)}px Georgia`; ctx.fillText(r.name, x + 4, y + cell * 0.32); }
      if (seen) for (const d of r.doors) { ctx.fillStyle = '#000'; if (d.side === 'W' || d.side === 'E') ctx.fillRect(d.side === 'W' ? x - 1 : x + w - 3, oy + d.row * cell + cell * 0.55, 4, cell * 0.3); else ctx.fillRect(ox + d.col * cell + cell * 0.35, d.side === 'N' ? y - 1 : y + h - 3, cell * 0.3, 4); }
    }
    if (this.g.objective) { const o = this.g.objective; ctx.fillStyle = '#ff7a30'; ctx.beginPath(); ctx.arc(ox + o.c * cell, oy + o.r * cell, Math.max(3, cell * 0.18) * (1 + 0.25 * Math.sin(performance.now() / 160)), 0, 7); ctx.fill(); }
    if ((performance.now() / 300 | 0) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(ox + pc * cell - 3, oy + (pr - 1 + 0.7) * cell - 3, 6, 6); }
  }
  minimap() {
    const c = $('minimap'), ctx = c.getContext('2d');
    const p = this.g.player.pos; this.drawMap(ctx, c.width, c.height, 14, p.x / SW, -(p.y / SH) + 0.5, false);
  }
  bigmap() {
    const c = $('bigmap'), ctx = c.getContext('2d');
    ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, c.width, c.height);
    this.drawMap(ctx, c.width, c.height, 46, 13.5, -2.2, true);
    ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, c.width, c.height); ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ inventory
  toggle(name) {
    const el = { inv: $('inv'), map: $('mapScreen') };
    if (this.open === name) { el[name].classList.add('hidden'); this.open = null; audio.play(name === 'map' ? 'map_close' : 'book_close', 0.4); return; }
    if (this.open) el[this.open].classList.add('hidden');
    this.open = name; el[name].classList.remove('hidden'); audio.play(name === 'map' ? 'map_open' : 'book_open', 0.4);
    if (name === 'inv') { this.sel = 0; this.socketMode = null; this.renderInv(); } else this.bigmap();
  }
  packItems() {
    const b = this.g.player.bag;
    const f = { all: () => true, weapons: i => i.base && BASES[i.base].slot === 'weapon', armor: i => i.base && BASES[i.base].slot !== 'weapon', gems: i => !!i.gem }[this.tab];
    return b.filter(f);
  }
  invKey(code) {
    const P = this.g.player;
    if (this.socketMode) {
      const targets = this.socketTargets();
      if (code === 'ArrowDown') this.sel = (this.sel + 1) % Math.max(1, targets.length);
      else if (code === 'ArrowUp') this.sel = (this.sel - 1 + targets.length) % Math.max(1, targets.length);
      else if (code === 'Enter' || code === 'KeyS') { const t = targets[this.sel]; if (t) this.insertGem(this.socketMode, t); }
      else if (code === 'Escape' || code === 'Backspace') { this.socketMode = null; this.sel = 0; }
      return this.renderInv();
    }
    const list = this.packItems();
    if (code === 'ArrowDown') this.sel = Math.min(list.length - 1, this.sel + 1);
    else if (code === 'ArrowUp') this.sel = Math.max(0, this.sel - 1);
    else if (code === 'ArrowRight' || code === 'ArrowLeft') { const tabs = ['all', 'weapons', 'armor', 'gems']; this.tab = tabs[(tabs.indexOf(this.tab) + (code === 'ArrowRight' ? 1 : 3)) % 4]; this.sel = 0; audio.play('ui_pointer', 0.3); }
    else if (code === 'Enter' || code === 'KeyE') { const it = list[this.sel]; if (it?.base) this.equipFromPack(it); }
    else if (code === 'KeyS') { const it = list[this.sel]; if (it?.gem) { this.socketMode = it; this.sel = 0; audio.play('ui_popup', 0.4); } }
    this.renderInv();
  }
  async equipFromPack(it) {
    const base = BASES[it.base]; let slot = base.slot;
    if (slot === 'ring') slot = !this.g.player.equip.ring1 ? 'ring1' : 'ring2';
    await this.g.player.equipItem(slot, it);
    this.toast(`Equipped ${it.name}`, it.rarity); this.g.onEquip?.(it); this.renderInv();
  }
  socketTargets() {
    const P = this.g.player, all = [...Object.values(P.equip).filter(Boolean), ...P.bag.filter(i => i.base)];
    return all.filter(i => i.sockets > i.gems.length);
  }
  async insertGem(gem, item) {
    const P = this.g.player; item.gems.push(gem.gem); P.bag = P.bag.filter(i => i !== gem);
    audio.play('gem_collect', 0.6); this.toast(`${GEMS[gem.gem].name} set into ${item.name}`, 'gem');
    for (const [slot, it] of Object.entries(P.equip)) if (it === item) await P.attachVisual(slot);
    P.refreshStats(); this.socketMode = null; this.sel = 0; this.g.onEquip?.(item); this.renderInv();
    if (P.equip.weapon === item && GEMS[gem.gem].weapon.elem) { this.toggle('inv'); this.g.ignite(GEMS[gem.gem].weapon.elem); }
  }
  renderInv() {
    const P = this.g.player, s = P.stats; P.refreshStats(); const d = P.d;
    $('stats').innerHTML = [['Level', s.lvl], ['Life', `${Math.ceil(s.hp)}/${s.hpMax}`], ['Mana', `${s.mp}/${s.mpMax}`], ['Strength', d.str], ['Constitution', s.con], ['Intellect', s.int], ['Luck', s.lck], ['Attack', `${d.dmg[0]}-${d.dmg[1]}` + d.elems.map(e => ` +${e.dmg[0]}-${e.dmg[1]} ${e.elem}`).join('')], ['Defense', d.def], ['Experience', `${s.xp}/${s.next}`], ['Gold', s.gold]]
      .map(([k, v]) => `<span class="k">${k}</span><span>${v}</span>`).join('');
    $('slots').innerHTML = SLOTS.map(sl => { const it = P.equip[sl.id]; return `<div class="slot"><span class="n">${sl.label}</span><span class="q-${it?.rarity || 'normal'}">${it ? it.name + sockDots(it) : '—'}</span></div>`; }).join('');
    $('tabs').innerHTML = ['all', 'weapons', 'armor', 'gems'].map(t => `<span class="${t === this.tab ? 'on' : ''}">${t.toUpperCase()}</span>`).join('');
    let list, detailItem;
    if (this.socketMode) {
      list = this.socketTargets();
      $('packList').innerHTML = `<li style="opacity:.7;pointer-events:none">Set the ${GEMS[this.socketMode.gem].name} into…</li>` + (list.length ? list.map((it, i) => `<li class="${i === this.sel ? 'sel' : ''} q-${it.rarity}">${it.name}${sockDots(it)}<small>${Object.values(P.equip).includes(it) ? 'equipped' : ''}</small></li>`).join('') : '<li>No item has an open socket.</li>');
      detailItem = list[this.sel];
    } else {
      list = this.packItems(); this.sel = Math.min(this.sel, Math.max(0, list.length - 1));
      $('packList').innerHTML = list.length ? list.map((it, i) => `<li class="${i === this.sel ? 'sel' : ''} q-${it.rarity}">${it.name}${it.base ? sockDots(it) : ''}<small>${it.gem ? 'gem' : BASES[it.base].slot}</small></li>`).join('') : '<li style="opacity:.5">Your pack is empty.</li>';
      detailItem = list[this.sel];
    }
    $('packList').querySelectorAll('li').forEach((li, i) => li.onclick = () => { const off = this.socketMode ? 1 : 0; if (i - off < 0) return; if (this.sel === i - off) this.invKey('Enter'); else { this.sel = i - off; this.renderInv(); } });
    $('tabs').querySelectorAll('span').forEach((sp, i) => sp.onclick = () => { this.tab = ['all', 'weapons', 'armor', 'gems'][i]; this.sel = 0; this.renderInv(); });
    $('detail').innerHTML = detailItem ? this.describe(detailItem) : '';
  }
  describe(it) {
    if (it.gem) { const G = GEMS[it.gem]; return `<h3 class="q-gem">${G.name}</h3><div class="type">Gem — socket into gear (S)</div><div class="line"><b>Weapon:</b> ${G.weapon.text}</div><div class="line"><b>Armor:</b> ${G.armor.text}</div><div class="line"><b>Shield:</b> ${G.shield.text}</div><div class="act">[S] Socket into an item</div>`; }
    const b = BASES[it.base], st = itemStats(it);
    let h = `<h3 class="q-${it.rarity}">${it.name}</h3><div class="type">${it.rarity !== 'normal' ? it.rarity[0].toUpperCase() + it.rarity.slice(1) + ' ' : ''}${b.name}${b.hands === 2 ? ' · Two-Handed' : ''}</div>`;
    if (st.dmg) h += `<div class="line">Damage: ${st.dmg[0]}-${st.dmg[1]}</div>`;
    if (b.def) h += `<div class="line">Defense: ${st.def}</div>`; if (b.block) h += `<div class="line">Block: ${Math.round(b.block * 100)}%</div>`;
    for (const l of st.lines) h += `<div class="line ${l.cls === 'aff' ? 'aff' : ''}" ${l.css ? `style="color:${l.css}"` : ''}>${l.text}</div>`;
    if (it.sockets) h += `<div class="sockets">${Array.from({ length: it.sockets }, (_, i) => { const g = it.gems[i]; return `<span class="sock" style="${g ? `background:radial-gradient(circle at 35% 35%,#fff,${GEMS[g].css} 45%,#000);border-color:${GEMS[g].css}` : ''}"></span>`; }).join('')}</div>`;
    h += `<div class="act">${this.socketMode ? '[Enter] Socket here · [Esc] cancel' : '[Enter] Equip'}</div>`;
    return h;
  }
}
function sockDots(it) { return it.sockets ? ` <small>[${it.gems.length}/${it.sockets}]</small>` : ''; }
