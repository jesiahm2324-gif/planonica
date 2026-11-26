/* PlanoNica — Fase 1
   Planos 2D y 3D, materiales (piedra cantera / bloque), presupuesto, gastos y exportación.
   Funciona sin internet (service worker) y guarda los datos en el dispositivo. */
'use strict';
(() => {
const APP_VERSION = '1.0.0';
const G = 0.5; // cuadrícula del plano (m)
const MAMP = {
  cantera: { name: 'Piedra cantera 15×40×60 cm', L: 0.60, h: 0.40, t: 0.15, j: 0.015, color: [0.79, 0.54, 0.35] },
  bloque6: { name: 'Bloque de concreto 15×20×40 cm (6")', L: 0.39, h: 0.19, t: 0.15, j: 0.01, color: [0.66, 0.67, 0.64] },
  bloque4: { name: 'Bloque de concreto 10×20×40 cm (4")', L: 0.39, h: 0.19, t: 0.10, j: 0.01, color: [0.70, 0.71, 0.68] },
  custom:  { name: 'Unidad personalizada', L: 0, h: 0, t: 0, j: 0, color: [0.75, 0.6, 0.45] }
};
const DEF = {H:2.7,mamp:'cantera',maxSp:3,colS:0.15,vaB:0.20,vaH:0.20,viOn:true,viB:0.15,viH:0.15,vcB:0.15,vcH:0.20,excB:0.40,excD:0.60,zapOn:true,zapL:0.60,zapE:0.20,estSep:0.15,rebarL:6,tras:10,alamP:2,desp:7,cemC:8.7,arC:0.51,piC:0.77,cemM:9.0,arM:1.05,repOn:true,repE:0.015,finoOn:true,pisoOn:true,firmeE:0.05,ceramOn:true,pegRend:4.5,techoOn:true,pend:25,alero:0.6,zAncho:0.72,zLargo:3.66,zTras:0.15,perSep:0.9,perL:6,cumUtil:1.7,tornLam:8,cuL:0.40,cuH:0.20,cuT:0.15,cuJ:0.01,winTop:2.1};
const SCHEMA = [
 ['Paredes',[['mamp','Material de pared','sel'],['H','Altura de pared sobre viga asísmica','m'],['winTop','Altura del dintel (parte alta de puertas y ventanas)','m'],['desp','Desperdicio general','%'],['cuL','Personalizada: largo de unidad','m'],['cuH','Personalizada: alto de unidad','m'],['cuT','Personalizada: espesor','m'],['cuJ','Personalizada: junta de mortero','m']]],
 ['Columnas y vigas',[['maxSp','Separación máxima entre columnas','m'],['colS','Columna: lado de sección','m'],['vaB','Viga asísmica: ancho','m'],['vaH','Viga asísmica: alto','m'],['viOn','Usar viga intermedia','b'],['viB','Viga intermedia: ancho','m'],['viH','Viga intermedia: alto','m'],['vcB','Viga corona: ancho','m'],['vcH','Viga corona: alto','m'],['estSep','Separación de estribos','m'],['rebarL','Largo de varilla','m'],['tras','Traslapes en vigas','%'],['alamP','Alambre de amarre (% del peso del acero)','%']]],
 ['Fundación',[['excB','Zanja: ancho','m'],['excD','Zanja: profundidad','m'],['zapOn','Zapatas bajo columnas','b'],['zapL','Zapata: lado','m'],['zapE','Zapata: espesor','m']]],
 ['Mezclas por m³',[['cemC','Concreto 1:2:3 — cemento','bolsas'],['arC','Concreto — arena','m³'],['piC','Concreto — piedrín','m³'],['cemM','Mortero 1:4 — cemento','bolsas'],['arM','Mortero — arena','m³']]],
 ['Acabados y piso',[['repOn','Repello en ambas caras','b'],['repE','Espesor de repello','m'],['finoOn','Incluir fino','b'],['pisoOn','Incluir firme de concreto','b'],['firmeE','Espesor del firme','m'],['ceramOn','Incluir cerámica','b'],['pegRend','Rendimiento de pegamento','m²/bolsa']]],
 ['Techo de zinc (2 aguas)',[['techoOn','Calcular techo','b'],['pend','Pendiente','%'],['alero','Alero','m'],['zAncho','Lámina: ancho útil','m'],['zLargo','Lámina: largo','m'],['zTras','Traslape entre láminas','m'],['perSep','Separación de perlines','m'],['perL','Largo de perlín','m'],['cumUtil','Cumbrera: largo útil','m'],['tornLam','Tornillos por lámina','u']]]
];
const CATS = ['Compra de materiales','Mano de obra','Transporte','Permisos y planos','Alquiler y herramientas','Agua y energía','Otros'];
const PARTS = [['fund','Fundación'],['estr','Columnas y vigas'],['par','Paredes'],['rep','Repello y fino'],['piso','Piso'],['techo','Techo']];

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const r2 = x => Math.round(x * 100) / 100, up1 = x => Math.ceil(x * 10 - 1e-9) / 10;
const money = x => 'C$ ' + (x || 0).toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const money0 = x => 'C$ ' + Math.round(x || 0).toLocaleString('es-NI');
const num = x => (+x || 0).toLocaleString('es-NI', {maximumFractionDigits: 2});
const fdate = t => new Date(t).toLocaleDateString('es-NI', {day: 'numeric', month: 'short', year: 'numeric'});
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('No se pudo guardar: la memoria del navegador está llena'); return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function download(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = s => (s || 'proyecto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'proyecto';

/* ---------- datos ---------- */
let index = LS.get('pm.index', []);
let prices = LS.get('pm.prices', {});
let P = null;
function blank(name) { return {id: uid(), name: name || 'Proyecto nuevo', created: Date.now(), updated: Date.now(), lot: {w: 12, h: 14}, rooms: [], walls: [], cut: [], openings: [], set: {...DEF}, custom: [], gastos: [], budget: ''}; }
function sample() {
  const R = (n, x, y, w, h) => ({id: uid(), name: n, x, y, w, h});
  const O = (type, o, x, y, w, h) => ({id: uid(), type, o, x, y, w, h});
  const p = blank('Casa ejemplo 8 × 9 m');
  p.rooms = [R('Sala-comedor', 2, 2, 5, 4.5), R('Cocina', 7, 2, 3, 4.5), R('Dormitorio 1', 2, 6.5, 4, 4.5), R('Dormitorio 2', 6, 6.5, 4, 3), R('Baño', 6, 9.5, 2, 1.5), R('Lavandero', 8, 9.5, 2, 1.5)];
  p.openings = [O('door','h',3.5,2,1.0,2.1),O('win','h',5.6,2,1.5,1.0),O('win','h',8.5,2,1.2,1.0),O('door','v',7,4.25,0.9,2.1),O('door','h',4,6.5,0.9,2.1),O('door','h',6.5,6.5,0.8,2.1),O('door','h',7,9.5,0.8,2.1),O('door','v',10,10.25,0.9,2.1),O('win','v',2,8.75,1.2,1.0),O('win','h',4,11,1.2,1.0),O('win','v',10,8,1.2,1.0),O('win','h',7,11,0.6,0.6)];
  return p;
}
function norm(p) {
  p.set = {...DEF, ...(p.set || {})};
  for (const k of ['rooms','walls','cut','openings','custom','gastos']) if (!Array.isArray(p[k])) p[k] = [];
  p.lot = p.lot || {w: 12, h: 14}; p.id = p.id || uid(); p.name = p.name || 'Proyecto'; p.created = p.created || Date.now(); p.updated = p.updated || Date.now();
  return p;
}
function loadP(id) { const p = LS.get('pm.p.' + id, null); return p ? norm(p) : null; }
function meta(p) {
  const R = calc(p), E = R.E, bb = bbox(E);
  let path = ''; for (const k of E) { const [t, a, b] = k.split(':'); path += t === 'h' ? `M${a*G} ${b*G}h${G}` : `M${a*G} ${b*G}v${G}`; }
  return {id: p.id, name: p.name, updated: p.updated, area: R.Af, total: R.matTotal + R.gastoTotal, path, vb: bb ? [bb.x - 0.5, bb.y - 0.5, bb.w + 1, bb.h + 1] : null};
}
function saveIndex() { LS.set('pm.index', index); }
function putP(p) { if (!LS.set('pm.p.' + p.id, p)) return; const m = meta(p); const i = index.findIndex(x => x.id === p.id); if (i >= 0) index[i] = m; else index.unshift(m); saveIndex(); }
let saveT;
function save() { if (!P) return; P.updated = Date.now(); clearTimeout(saveT); saveT = setTimeout(() => putP(P), 300); }
function savePrices() { LS.set('pm.prices', prices); LS.set('pm.pricesDate', Date.now()); }
function openP(id) { const p = loadP(id); if (!p) { toast('No se encontró el proyecto'); return false; } P = p; LS.set('pm.cur', id); hist = []; fut = []; sel = null; first = null; zoom = 0; dirty3 = true; return true; }

/* ---------- geometría ---------- */
const gi = v => Math.round(v / G);
function edges(p) {
  const E = new Set();
  const addH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x < Math.max(x1, x2); x++) E.add('h:' + x + ':' + y); };
  const addV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y++) E.add('v:' + x + ':' + y); };
  for (const r of p.rooms) { const x = gi(r.x), y = gi(r.y), X = gi(r.x + r.w), Y = gi(r.y + r.h); addH(x, X, y); addH(x, X, Y); addV(y, Y, x); addV(y, Y, X); }
  for (const w of p.walls) { if (gi(w.y1) === gi(w.y2)) addH(gi(w.x1), gi(w.x2), gi(w.y1)); else addV(gi(w.y1), gi(w.y2), gi(w.x1)); }
  for (const k of p.cut) E.delete(k);
  return E;
}
function nb(E, x, y) { return {R: E.has('h:'+x+':'+y), L: E.has('h:'+(x-1)+':'+y), D: E.has('v:'+x+':'+y), U: E.has('v:'+x+':'+(y-1))}; }
function isCol(E, x, y) { const n = nb(E, x, y), d = n.R + n.L + n.D + n.U; if (!d) return false; if (d !== 2) return true; return !((n.R && n.L) || (n.U && n.D)); }
function runs(E) { // tramos rectos máximos: {dir, f, s0, s1} en unidades de cuadrícula
  const out = [];
  for (const dir of ['h', 'v']) {
    const lines = new Map();
    for (const k of E) { const [d, a, b] = k.split(':'); if (d !== dir) continue; const f = dir === 'h' ? +b : +a, pos = dir === 'h' ? +a : +b; if (!lines.has(f)) lines.set(f, []); lines.get(f).push(pos); }
    for (const [f, arr] of lines) { arr.sort((a, b) => a - b); let i = 0; while (i < arr.length) { let j = i; while (j + 1 < arr.length && arr[j + 1] === arr[j] + 1) j++; out.push({dir, f, s0: arr[i], s1: arr[j] + 1}); i = j + 1; } }
  }
  return out;
}
function columns(p, E) {
  const cols = new Map(), sp = Math.max(G, p.set.maxSp || 3);
  const add = (x, y) => cols.set(x.toFixed(3) + ',' + y.toFixed(3), {x, y});
  for (const r of runs(E)) {
    const pt = q => r.dir === 'h' ? [q, r.f] : [r.f, q];
    let last = r.s0;
    for (let q = r.s0; q <= r.s1; q++) {
      const [x, y] = pt(q);
      if (q === r.s0 || q === r.s1 || isCol(E, x, y)) {
        add(x * G, y * G);
        if (q > last) { const L = (q - last) * G, n = Math.max(0, Math.ceil(L / sp - 1e-9) - 1); for (let k = 1; k <= n; k++) { const m = last + (q - last) * k / (n + 1); const [mx, my] = pt(m); add(mx * G, my * G); } }
        last = q;
      }
    }
  }
  return [...cols.values()];
}
function opOK(E, o) { return o.o === 'h' ? E.has('h:' + Math.floor(o.x / G + 1e-6) + ':' + gi(o.y)) : E.has('v:' + gi(o.x) + ':' + Math.floor(o.y / G + 1e-6)); }
function bbox(E) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const k of E) { const [t, x, y] = k.split(':'); const X = +x * G, Y = +y * G; a = Math.min(a, X); b = Math.min(b, Y); c = Math.max(c, X + (t === 'h' ? G : 0)); d = Math.max(d, Y + (t === 'v' ? G : 0)); } return E.size ? {x: a, y: b, w: c - a, h: d - b} : null; }
function mampOf(p) { const s = p.set; return s.mamp === 'custom' ? {...MAMP.custom, name: 'Unidad personalizada ' + num(s.cuL * 100) + '×' + num(s.cuH * 100) + ' cm', L: s.cuL, h: s.cuH, t: s.cuT, j: s.cuJ} : (MAMP[s.mamp] || MAMP.cantera); }

/* ---------- cálculo de materiales ---------- */
function matNames(p) {
  const s = p.set, m = mampOf(p), ft = Math.round(s.zLargo / 0.3048);
  return {
    cemento: ['Cemento (bolsa 42.5 kg)', 'bolsa', 1], arena: ['Arena', 'm³', 0], piedrin: ['Piedrín', 'm³', 0],
    mamp: [m.name, 'unidad', 1], var3: ['Varilla corrugada #3 (3/8") de ' + num(s.rebarL) + ' m', 'pieza', 1],
    var2: ['Varilla #2 (1/4") para estribos, ' + num(s.rebarL) + ' m', 'pieza', 1], alambre: ['Alambre de amarre', 'lb', 1],
    zinc: ['Lámina de zinc ondulada ' + ft + ' pies', 'lámina', 1], perlin: ['Perlín 2"×4" de ' + num(s.perL) + ' m', 'pieza', 1],
    cumbrera: ['Cumbrera galvanizada', 'pieza', 1], tornillo: ['Tornillo para techo con arandela', 'unidad', 1],
    ceramica: ['Cerámica de piso', 'm²', 0], pegamento: ['Pegamento para cerámica', 'bolsa', 1], fino: ['Fino de paredes (material o por m²)', 'm²', 0]
  };
}
const ORDER = ['cemento','arena','piedrin','mamp','var3','var2','alambre','zinc','perlin','cumbrera','tornillo','ceramica','pegamento','fino'];
const priceKey = (p, k) => k === 'mamp' ? 'mamp_' + p.set.mamp : k;
function calc(p) {
  const s = p.set, E = edges(p), Lw = E.size * G, cols = columns(p, E), Nc = cols.length, d = 1 + s.desp / 100;
  const ops = p.openings.filter(o => opOK(E, o)), openA = ops.reduce((a, o) => a + o.w * o.h, 0);
  const m = mampOf(p), hM = Math.max(0, s.H - s.vcH - (s.viOn ? s.viH : 0));
  const Am = Math.max(0, (Lw - Nc * s.colS) * hM - openA);
  const cell = (m.L + m.j) * (m.h + m.j), nPer = cell > 0 ? 1 / cell : 0, morPer = cell > 0 ? m.t * (1 - (m.L * m.h) / cell) : 0;
  const repA = s.repOn ? Math.max(0, 2 * (Lw * s.H - openA)) : 0;
  const bb = bbox(E);
  let Af = p.rooms.reduce((a, r) => a + r.w * r.h, 0); if (!Af && bb) Af = bb.w * bb.h;
  const below = Math.max(0, s.excD - s.vaH - (s.zapOn ? s.zapE : 0));
  const vVA = s.vaB * s.vaH * Lw, vVI = s.viOn ? s.viB * s.viH * Lw : 0, vVC = s.vcB * s.vcH * Lw;
  const vCol = Nc * s.colS * s.colS * (s.H + below), vZap = s.zapOn ? Nc * s.zapL * s.zapL * s.zapE : 0, vFir = s.pisoOn ? Af * s.firmeE : 0;
  const conc = v => ({cemento: v * d * s.cemC, arena: v * d * s.arC, piedrin: v * d * s.piC});
  const mort = v => ({cemento: v * s.cemM, arena: v * s.arM});
  const est = (b, h) => 2 * (b - 0.05) + 2 * (h - 0.05) + 0.10;
  const steel = (l3, l2) => ({var3: l3 * d / s.rebarL, var2: l2 * d / s.rebarL, alambre: (l3 * 0.56 + l2 * 0.25) * 2.2046 * s.alamP / 100, _l3: l3, _l2: l2});
  const add = (...os) => { const r = {}; for (const o of os) for (const k in o) r[k] = (r[k] || 0) + o[k]; return r; };
  const zb = s.zapOn ? Math.ceil(s.zapL / 0.15) : 0;
  const beamSteel = (b, h) => steel(4 * Lw * (1 + s.tras / 100), Math.ceil(Lw / s.estSep) * est(b, h));
  const parts = {
    fund: add(conc(vVA + vZap), beamSteel(s.vaB, s.vaH), steel(Nc * 2 * zb * Math.max(0, s.zapL - 0.05), 0)),
    estr: add(conc(vCol + vVI + vVC), steel(Nc * 4 * (s.H + s.excD + 0.30), Nc * Math.ceil((s.H + s.excD) / s.estSep) * est(s.colS, s.colS)), beamSteel(s.vcB, s.vcH), s.viOn ? beamSteel(s.viB, s.viH) : {}),
    par: add({mamp: Am * nPer * d}, mort(Am * morPer * d)),
    rep: add(mort(repA * s.repE * d), s.finoOn && repA ? {fino: repA} : {}),
    piso: add(conc(vFir), s.ceramOn && Af ? {ceramica: Af * 1.10, pegamento: Af * 1.10 / s.pegRend} : {}),
    techo: {}
  };
  let roof = null;
  if (s.techoOn && bb) {
    const lg = Math.max(bb.w, bb.h) + 2 * s.alero, run = Math.min(bb.w, bb.h) / 2 + s.alero, sl = run * Math.sqrt(1 + (s.pend / 100) ** 2);
    const zinc = 2 * Math.ceil(lg / s.zAncho) * Math.ceil(sl / Math.max(0.5, s.zLargo - s.zTras));
    const rowsP = Math.ceil(sl / s.perSep) + 1;
    roof = {lg, sl, area: 2 * lg * sl};
    parts.techo = {zinc, perlin: 2 * rowsP * lg * 1.05 / s.perL, cumbrera: lg / s.cumUtil, tornillo: zinc * s.tornLam};
  }
  const names = matNames(p), tot = add(...Object.values(parts));
  const items = ORDER.filter(k => tot[k] > 1e-6).map(k => { const [n, u, int] = names[k]; return {k, pk: priceKey(p, k), n, u, q: int ? Math.ceil(tot[k] - 1e-9) : up1(tot[k])}; });
  const pr = k => +prices[k] || 0;
  const partCost = PARTS.map(([k, n]) => ({k, n, c: Object.entries(parts[k]).reduce((a, [mk, q]) => mk[0] === '_' ? a : a + q * pr(priceKey(p, mk)), 0)}));
  const matTotal = items.reduce((a, i) => a + i.q * pr(i.pk), 0) + p.custom.reduce((a, c) => a + (+c.q || 0) * (+c.p || 0), 0);
  const gastoTotal = p.gastos.reduce((a, g) => a + (+g.m || 0), 0);
  const l3 = Object.values(parts).reduce((a, o) => a + (o._l3 || 0), 0), l2 = Object.values(parts).reduce((a, o) => a + (o._l2 || 0), 0);
  const vExc = Lw * s.excB * s.excD + (s.zapOn ? Nc * Math.max(0, s.zapL * s.zapL - s.excB * s.zapL) * s.excD : 0);
  const info = [['Paredes (largo total)', Lw, 'm'], ['Columnas', Nc, 'u'], ['Puertas y ventanas', openA, 'm²'], ['Mampostería neta', Am, 'm²'], ['Unidades por m²', nPer, 'u/m²'],
    ['Excavación', vExc, 'm³'], ['Concreto viga asísmica', vVA, 'm³'], ['Concreto viga intermedia', vVI, 'm³'], ['Concreto viga corona', vVC, 'm³'], ['Concreto columnas', vCol, 'm³'], ['Concreto zapatas', vZap, 'm³'],
    ['Área de piso', Af, 'm²'], ['Concreto del firme', vFir, 'm³'], ['Repello (área, dos caras)', repA, 'm²'], ['Varilla #3 (largo sin desperdicio)', l3, 'm'], ['Varilla #2 (largo sin desperdicio)', l2, 'm']];
  if (roof) info.push(['Techo: largo con aleros', roof.lg, 'm'], ['Techo: caída por agua', roof.sl, 'm'], ['Techo: área', roof.area, 'm²']);
  return {E, Lw, cols, Nc, openA, Am, Af, items, info, roof, ops, bb, partCost, matTotal, gastoTotal, m};
}

/* ---------- plano 2D ---------- */
let tool = 'sel', first = null, sel = null, zoom = 0, hist = [], fut = [];
const svg = $('#svg');
function snapH() { hist.push(JSON.stringify({rooms: P.rooms, walls: P.walls, cut: P.cut, openings: P.openings})); if (hist.length > 80) hist.shift(); fut = []; }
function svgPt(e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
const sn = v => Math.round(v / G) * G, clX = v => Math.max(0, Math.min(P.lot.w, v)), clY = v => Math.max(0, Math.min(P.lot.h, v));
function nearestEdge(E, x, y) { let best = null, bd = 0.45; for (const k of E) { const [t, a, b] = k.split(':'); const X = +a * G, Y = +b * G; let px, py; if (t === 'h') { px = Math.max(X, Math.min(X + G, x)); py = Y; } else { px = X; py = Math.max(Y, Math.min(Y + G, y)); } const dd = Math.hypot(px - x, py - y); if (dd < bd) { bd = dd; best = {k, t, px, py}; } } return best; }
function runKeys(E, k) {
  const [t, a, b] = k.split(':'), A = +a, B = +b, out = [k];
  if (t === 'h') { for (let x = A; ; x--) { if (isCol(E, x, B) || !E.has('h:'+(x-1)+':'+B)) break; out.push('h:'+(x-1)+':'+B); } for (let x = A + 1; ; x++) { if (isCol(E, x, B) || !E.has('h:'+x+':'+B)) break; out.push('h:'+x+':'+B); } }
  else { for (let y = B; ; y--) { if (isCol(E, A, y) || !E.has('v:'+A+':'+(y-1))) break; out.push('v:'+A+':'+(y-1)); } for (let y = B + 1; ; y++) { if (isCol(E, A, y) || !E.has('v:'+A+':'+y)) break; out.push('v:'+A+':'+y); } }
  return out;
}
function hitOpening(x, y) { for (const o of P.openings) { const along = o.o === 'h' ? Math.abs(x - o.x) : Math.abs(y - o.y), across = o.o === 'h' ? Math.abs(y - o.y) : Math.abs(x - o.x); if (along <= o.w / 2 + 0.1 && across < 0.35) return o; } return null; }
function unCut(keys) { const s = new Set(keys); P.cut = P.cut.filter(k => !s.has(k)); }
function rectKeys(x, y, w, h) { const k = [], X = gi(x), Y = gi(y), X2 = gi(x + w), Y2 = gi(y + h); for (let i = X; i < X2; i++) k.push('h:'+i+':'+Y, 'h:'+i+':'+Y2); for (let j = Y; j < Y2; j++) k.push('v:'+X+':'+j, 'v:'+X2+':'+j); return k; }

svg.addEventListener('click', e => {
  if (!P) return;
  const pt = svgPt(e), x = pt.x, y = pt.y, E = edges(P);
  if (tool === 'sel') { const o = hitOpening(x, y); if (o) sel = {t: 'op', id: o.id}; else { const r = [...P.rooms].reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); sel = r ? {t: 'room', id: r.id} : null; } renderPlan(); return; }
  if (tool === 'room' || tool === 'wall') {
    const q = {x: clX(sn(x)), y: clY(sn(y))};
    if (!first) { first = q; renderPlan(); return; }
    if (tool === 'room') {
      const rx = Math.min(first.x, q.x), ry = Math.min(first.y, q.y), w = Math.abs(q.x - first.x), h = Math.abs(q.y - first.y);
      if (w >= 1 && h >= 1) { snapH(); const r = {id: uid(), name: 'Habitación ' + (P.rooms.length + 1), x: rx, y: ry, w, h}; P.rooms.push(r); unCut(rectKeys(rx, ry, w, h)); sel = {t: 'room', id: r.id}; tool = 'sel'; }
      else toast('La habitación debe medir al menos 1 × 1 m');
    } else {
      let x2 = q.x, y2 = q.y; if (Math.abs(x2 - first.x) >= Math.abs(y2 - first.y)) y2 = first.y; else x2 = first.x;
      if (x2 !== first.x || y2 !== first.y) { snapH(); P.walls.push({id: uid(), x1: first.x, y1: first.y, x2, y2}); const ks = []; if (y2 === first.y) for (let i = gi(Math.min(x2, first.x)); i < gi(Math.max(x2, first.x)); i++) ks.push('h:'+i+':'+gi(y2)); else for (let j = gi(Math.min(y2, first.y)); j < gi(Math.max(y2, first.y)); j++) ks.push('v:'+gi(x2)+':'+j); unCut(ks); }
    }
    first = null; commit(); return;
  }
  if (tool === 'door' || tool === 'win') {
    const ne = nearestEdge(E, x, y); if (!ne) { toast('Toca sobre una pared'); return; }
    snapH(); const o = {id: uid(), type: tool, o: ne.t, x: ne.t === 'h' ? Math.round(ne.px * 20) / 20 : ne.px, y: ne.t === 'v' ? Math.round(ne.py * 20) / 20 : ne.py, w: tool === 'door' ? 0.9 : 1.2, h: tool === 'door' ? 2.1 : 1.0};
    P.openings.push(o); sel = {t: 'op', id: o.id}; commit(); return;
  }
  if (tool === 'cut') {
    const o = hitOpening(x, y); if (o) { snapH(); P.openings = P.openings.filter(z => z !== o); commit(); return; }
    const ne = nearestEdge(E, x, y); if (!ne) { toast('Toca sobre una pared'); return; }
    snapH(); for (const k of runKeys(E, ne.k)) if (!P.cut.includes(k)) P.cut.push(k); commit();
  }
});
svg.addEventListener('pointermove', e => {
  const g = $('#ghost'); if (!g || !first) return; const pt = svgPt(e); let x = clX(sn(pt.x)), y = clY(sn(pt.y));
  if (tool === 'room') g.setAttribute('d', `M${first.x} ${first.y}H${x}V${y}H${first.x}Z`);
  else { if (Math.abs(x - first.x) >= Math.abs(y - first.y)) y = first.y; else x = first.x; g.setAttribute('d', `M${first.x} ${first.y}L${x} ${y}`); }
});
function commit() { dirty3 = true; save(); renderPlan(); }

const TH = {
  bp: {bg: '#17406f', grid: '#ffffff', lot: '#9fc4ef', wall: '#eef5ff', room: 'rgba(255,255,255,.05)', text: '#ffffff', sub: '#bcd6f5', open: '#ffffff', col: '#c2662d', colS: '#ffd7bd'},
  print: {bg: '#ffffff', grid: '#17406f', lot: '#6b86a8', wall: '#14243a', room: 'rgba(23,64,111,.04)', text: '#14243a', sub: '#4a5d77', open: '#14243a', col: '#c2662d', colS: '#7a3a12'}
};
function planInner(p, theme, opts = {}) {
  const T = TH[theme], W = p.lot.w, H = p.lot.h, R = opts.R || calc(p), E = R.E;
  let g = '';
  if (!opts.noGrid) {
    for (let x = 0; x <= W + 1e-6; x += G) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${T.grid}" stroke-opacity="${Math.abs(x % 1) < 1e-6 ? .16 : .06}" stroke-width="0.02"/>`;
    for (let y = 0; y <= H + 1e-6; y += G) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${T.grid}" stroke-opacity="${Math.abs(y % 1) < 1e-6 ? .16 : .06}" stroke-width="0.02"/>`;
  }
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${T.lot}" stroke-width="0.04" stroke-dasharray="0.25 0.15"/>`;
  g += `<text x="${W / 2}" y="${H + 0.6}" fill="${T.lot}" font-size="0.3" text-anchor="middle" font-family="system-ui,sans-serif">Terreno ${num(W)} × ${num(H)} m · cuadrícula 0.5 m</text>`;
  for (const r of p.rooms) {
    const on = opts.sel && opts.sel.t === 'room' && opts.sel.id === r.id;
    g += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${on ? 'rgba(194,102,45,.28)' : T.room}"/>`;
    const fs = Math.min(0.34, r.w / 7);
    g += `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" fill="${T.text}" font-size="${fs}" font-weight="600" text-anchor="middle" font-family="system-ui,sans-serif">${esc(r.name)}</text><text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + fs * 1.2}" fill="${T.sub}" font-size="${fs * 0.8}" text-anchor="middle" font-family="system-ui,sans-serif">${num(r.w * r.h)} m²</text>`;
  }
  let path = ''; for (const k of E) { const [t, a, b] = k.split(':'); path += t === 'h' ? `M${a * G} ${b * G}h${G}` : `M${a * G} ${b * G}v${G}`; }
  g += `<path d="${path}" stroke="${T.wall}" stroke-width="0.16" stroke-linecap="square" fill="none"/>`;
  for (const o of p.openings) {
    const ok = opOK(E, o), on = opts.sel && opts.sel.t === 'op' && opts.sel.id === o.id, c = on ? '#ffb27a' : T.open;
    const h = o.o === 'h', x1 = h ? o.x - o.w / 2 : o.x, y1 = h ? o.y : o.y - o.w / 2, x2 = h ? o.x + o.w / 2 : o.x, y2 = h ? o.y : o.y + o.w / 2;
    g += `<g opacity="${ok ? 1 : .35}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${T.bg}" stroke-width="0.22"/>`;
    if (o.type === 'door') { const lx = h ? x1 : x1 + o.w, ly = h ? y1 + o.w : y1; g += `<line x1="${x1}" y1="${y1}" x2="${lx}" y2="${ly}" stroke="${c}" stroke-width="0.04"/><path d="M${lx} ${ly}A${o.w} ${o.w} 0 0 0 ${x2} ${y2}" stroke="${c}" stroke-width="0.025" fill="none" stroke-dasharray="0.08 0.05"/>`; }
    else for (const dd of [-0.07, 0, 0.07]) g += `<line x1="${x1 + (h ? 0 : dd)}" y1="${y1 + (h ? dd : 0)}" x2="${x2 + (h ? 0 : dd)}" y2="${y2 + (h ? dd : 0)}" stroke="${c}" stroke-width="0.03"/>`;
    g += `</g>`;
  }
  for (const c of R.cols) g += `<rect x="${c.x - 0.11}" y="${c.y - 0.11}" width="0.22" height="0.22" fill="${T.col}" stroke="${T.colS}" stroke-width="0.02"/>`;
  const bb = R.bb;
  if (bb) g += `<g fill="${T.lot}" stroke="${T.lot}" font-size="0.28" font-family="system-ui,sans-serif"><line x1="${bb.x}" y1="${bb.y - 0.45}" x2="${bb.x + bb.w}" y2="${bb.y - 0.45}" stroke-width="0.02"/><text x="${bb.x + bb.w / 2}" y="${bb.y - 0.55}" stroke="none" text-anchor="middle">${num(bb.w)} m</text><line x1="${bb.x - 0.45}" y1="${bb.y}" x2="${bb.x - 0.45}" y2="${bb.y + bb.h}" stroke-width="0.02"/><text x="${bb.x - 0.55}" y="${bb.y + bb.h / 2}" stroke="none" text-anchor="middle" transform="rotate(-90 ${bb.x - 0.55} ${bb.y + bb.h / 2})">${num(bb.h)} m</text></g>`;
  return g;
}
function planSVG(p, theme, pxPerM) { const W = p.lot.w + 1.6, H = p.lot.h + 1.8; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.8 -1 ${W} ${H}" width="${W * pxPerM}" height="${H * pxPerM}"><rect x="-0.8" y="-1" width="${W}" height="${H}" fill="${TH[theme].bg}"/>${planInner(p, theme)}</svg>`; }
function renderPlan() {
  if (!P) return;
  const W = P.lot.w, H = P.lot.h, R = calc(P);
  if (!zoom) zoom = Math.max(18, Math.min(60, (($('#board').clientWidth || 600) - 4) / (W + 1.6)));
  svg.setAttribute('viewBox', `-0.8 -1 ${W + 1.6} ${H + 1.8}`); svg.setAttribute('width', (W + 1.6) * zoom); svg.setAttribute('height', (H + 1.8) * zoom);
  let g = planInner(P, 'bp', {sel, R});
  if (first) g += `<circle cx="${first.x}" cy="${first.y}" r="0.12" fill="#ffb27a"/><path id="ghost" d="" stroke="#ffb27a" stroke-width="0.06" fill="rgba(255,178,122,.15)" stroke-dasharray="0.15 0.1"/>`;
  svg.innerHTML = g;
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === tool);
  $('#undo').disabled = !hist.length; $('#redo').disabled = !fut.length;
  const HT = {sel: 'Toca una habitación o una puerta/ventana para editarla.', room: first ? 'Toca la esquina opuesta de la habitación.' : 'Toca la primera esquina de la habitación.', wall: first ? 'Toca el final de la pared (se mantiene recta).' : 'Toca el inicio de la pared.', door: 'Toca una pared para colocar una puerta.', win: 'Toca una pared para colocar una ventana.', cut: 'Toca un tramo de pared o una abertura para quitarlo.'};
  $('#hint').textContent = HT[tool];
  renderSel();
  $('#stats').innerHTML = [[num(R.Af) + ' m²', 'Área de piso'], [num(R.Lw) + ' m', 'Paredes'], [R.Nc, 'Columnas'], [num(R.Am) + ' m²', 'Mampostería neta']].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
  $('#q_mamp').value = P.set.mamp; $('#q_H').value = P.set.H; $('#q_lw').value = P.lot.w; $('#q_lh').value = P.lot.h;
}
function renderSel() {
  const S = $('#selpanel');
  if (sel && sel.t === 'room') { const r = P.rooms.find(z => z.id === sel.id); if (r) {
    S.innerHTML = `<h3>Habitación</h3><label for="s_rn">Nombre</label><input id="s_rn" value="${esc(r.name)}" maxlength="40"><div class="row" style="margin-top:10px"><div><label for="s_rw">Ancho (m)</label><input id="s_rw" type="number" step="0.5" value="${r.w}"></div><div><label for="s_rh">Largo (m)</label><input id="s_rh" type="number" step="0.5" value="${r.h}"></div></div><p class="sub">${num(r.w * r.h)} m² · posición ${num(r.x)}, ${num(r.y)} m</p><button id="s_del">Borrar habitación</button>`;
    $('#s_rn').onchange = e => { snapH(); r.name = e.target.value.slice(0, 40) || 'Habitación'; commit(); };
    const dim = (k, e) => { const v = sn(+e.target.value); if (v >= 1) { snapH(); r[k] = v; unCut(rectKeys(r.x, r.y, r.w, r.h)); commit(); } };
    $('#s_rw').onchange = e => dim('w', e); $('#s_rh').onchange = e => dim('h', e);
    $('#s_del').onclick = () => { snapH(); P.rooms = P.rooms.filter(z => z !== r); sel = null; commit(); }; return; } }
  if (sel && sel.t === 'op') { const o = P.openings.find(z => z.id === sel.id); if (o) {
    S.innerHTML = `<h3>${o.type === 'door' ? 'Puerta' : 'Ventana'}</h3><div class="row"><div><label for="s_ot">Tipo</label><select id="s_ot"><option value="door">Puerta</option><option value="win">Ventana</option></select></div><div><label for="s_ow">Ancho (m)</label><input id="s_ow" type="number" step="0.05" value="${o.w}"></div><div><label for="s_oh">Alto (m)</label><input id="s_oh" type="number" step="0.05" value="${o.h}"></div></div><p class="sub">Se descuentan ${num(o.w * o.h)} m² de pared.</p><button id="s_del">Borrar ${o.type === 'door' ? 'puerta' : 'ventana'}</button>`;
    $('#s_ot').value = o.type; $('#s_ot').onchange = e => { snapH(); o.type = e.target.value; commit(); };
    $('#s_ow').onchange = e => { const v = +e.target.value; if (v > 0.2) { snapH(); o.w = v; commit(); } };
    $('#s_oh').onchange = e => { const v = +e.target.value; if (v > 0.2) { snapH(); o.h = v; commit(); } };
    $('#s_del').onclick = () => { snapH(); P.openings = P.openings.filter(z => z !== o); sel = null; commit(); }; return; } }
  sel = null;
  S.innerHTML = `<h3>Cómo dibujar</h3><p class="sub" style="font-size:15px;margin:0">1. <b>Habitación</b>: dos toques en esquinas opuestas; crea sus 4 paredes.<br>2. <b>Pared</b>: dos toques para una pared suelta (tapias, divisiones).<br>3. <b>Puerta / Ventana</b>: toca sobre una pared.<br>4. <b>Quitar</b>: abre espacios o borra aberturas.<br>Los cuadros color cantera son las columnas calculadas.</p>`;
}
$('#tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; tool = b.dataset.tool; first = null; renderPlan(); });
const restoreH = h => { const o = JSON.parse(h); P.rooms = o.rooms; P.walls = o.walls; P.cut = o.cut; P.openings = o.openings; };
const curH = () => JSON.stringify({rooms: P.rooms, walls: P.walls, cut: P.cut, openings: P.openings});
$('#undo').onclick = () => { const h = hist.pop(); if (!h) return; fut.push(curH()); restoreH(h); sel = null; first = null; commit(); };
$('#redo').onclick = () => { const h = fut.pop(); if (!h) return; hist.push(curH()); restoreH(h); sel = null; first = null; commit(); };
$('#zin').onclick = () => { zoom = Math.min(120, zoom * 1.25); renderPlan(); };
$('#zout').onclick = () => { zoom = Math.max(14, zoom / 1.25); renderPlan(); };
$('#zfit').onclick = () => { zoom = 0; renderPlan(); };
$('#q_mamp').innerHTML = Object.entries(MAMP).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
$('#q_mamp').onchange = e => { P.set.mamp = e.target.value; commit(); };
$('#q_H').onchange = e => { const v = +e.target.value; if (v > 1.5 && v < 8) P.set.H = v; commit(); };
$('#q_lw').onchange = e => { const v = sn(+e.target.value); if (v >= 3 && v <= 200) P.lot.w = v; zoom = 0; commit(); };
$('#q_lh').onchange = e => { const v = sn(+e.target.value); if (v >= 3 && v <= 200) P.lot.h = v; zoom = 0; commit(); };

/* ---------- 3D (WebGL propio, sin librerías) ---------- */
let gl = null, prog = null, buf = null, nVerts = 0, dirty3 = true, mode3 = 'full';
const cam = {yaw: 0.75, pitch: 0.62, dist: 20, tx: 0, ty: 1, tz: 0};
const C3 = {conc: [0.56, 0.58, 0.61], beam: [0.48, 0.52, 0.57], floor: [0.91, 0.88, 0.82], ground: [0.45, 0.6, 0.38], roof: [0.62, 0.7, 0.76], zap: [0.5, 0.5, 0.52]};
function init3() {
  if (gl) return true;
  const c = $('#c3'); gl = c.getContext('webgl', {antialias: true, preserveDrawingBuffer: true}) || c.getContext('experimental-webgl', {preserveDrawingBuffer: true});
  if (!gl) { $('#v3').innerHTML = '<div class="empty" style="margin:20px">Este dispositivo no permite ver 3D (WebGL desactivado).</div>'; return false; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 M;uniform vec3 L;varying vec3 vc;void main(){float d=max(dot(normalize(n),L),0.0);float u=max(dot(normalize(n),vec3(0.0,1.0,0.0)),0.0);vc=c*(0.42+0.48*d+0.12*u);gl_Position=M*vec4(p,1.0);}'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec3 vc;void main(){gl_FragColor=vec4(vc,1.0);}'));
  gl.linkProgram(prog); gl.useProgram(prog); buf = gl.createBuffer(); gl.enable(gl.DEPTH_TEST);
  const v3 = $('#v3'); const ro = new ResizeObserver(() => draw3()); ro.observe(v3);
  // gestos
  const pts = new Map(); let pinch = 0;
  c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x: e.clientX, y: e.clientY}); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  c.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); const cur = {x: e.clientX, y: e.clientY}; pts.set(e.pointerId, cur);
    if (pts.size === 1) { cam.yaw -= (cur.x - prev.x) * 0.01; cam.pitch = Math.max(0.03, Math.min(1.55, cam.pitch + (cur.y - prev.y) * 0.01)); }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) cam.dist = Math.max(3, Math.min(200, cam.dist * pinch / d)); pinch = d; }
    for (const b of document.querySelectorAll('#ov3 [data-view]')) b.classList.remove('on');
    draw3();
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  c.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(3, Math.min(200, cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); draw3(); }, {passive: false});
  return true;
}
function build3() {
  const a = [], s = P.set, R = calc(P), E = R.E, bb = R.bb, m = R.m, t = Math.max(0.1, m.t || 0.15), cs = s.colS;
  const quad = (p0, p1, p2, p3, n, c) => { for (const v of [p0, p1, p2, p0, p2, p3]) a.push(v[0], v[1], v[2], n[0], n[1], n[2], c[0], c[1], c[2]); };
  const tri = (p0, p1, p2, c) => { const u = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]], v = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]]; let n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; if (n[1] < 0 || (n[1] === 0 && n[0] + n[2] < 0)) n = n.map(z => -z); for (const q of [p0, p1, p2]) a.push(q[0], q[1], q[2], n[0], n[1], n[2], c[0], c[1], c[2]); };
  const box = (x0, y0, z0, x1, y1, z1, c) => {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const V = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    quad(V[0],V[1],V[2],V[3],[0,0,-1],c); quad(V[5],V[4],V[7],V[6],[0,0,1],c); quad(V[4],V[0],V[3],V[7],[-1,0,0],c);
    quad(V[1],V[5],V[6],V[2],[1,0,0],c); quad(V[3],V[2],V[6],V[7],[0,1,0],c); quad(V[4],V[5],V[1],V[0],[0,-1,0],c);
  };
  // caja a lo largo de un tramo: u = posición a lo largo, f = línea fija
  const along = (dir, f, u0, u1, y0, y1, th, c) => dir === 'h' ? box(u0, y0, f - th / 2, u1, y1, f + th / 2, c) : box(f - th / 2, y0, u0, f + th / 2, y1, u1, c);
  const Hfull = s.H, Hw = mode3 === 'corte' ? Math.min(1.2, Hfull) : Hfull, wallC = m.color || MAMP.cantera.color;
  const estr = mode3 === 'estr';
  if (!estr) box(-0.3, -0.08, -0.3, P.lot.w + 0.3, -0.03, P.lot.h + 0.3, C3.ground);
  if (!estr) { if (P.rooms.length) for (const r of P.rooms) box(r.x, -0.03, r.y, r.x + r.w, 0, r.y + r.h, C3.floor); else if (bb) box(bb.x, -0.03, bb.y, bb.x + bb.w, 0, bb.y + bb.h, C3.floor); }
  const RU = runs(E);
  for (const r of RU) {
    const f = r.f * G, u0 = r.s0 * G - t / 2, u1 = r.s1 * G + t / 2;
    if (estr) {
      along(r.dir, f, u0, u1, -s.vaH, 0, s.vaB, C3.beam);
      if (s.viOn) along(r.dir, f, u0, u1, 1.0, 1.0 + s.viH, s.viB, C3.beam);
      along(r.dir, f, u0, u1, Hfull - s.vcH, Hfull, s.vcB, C3.beam);
      continue;
    }
    const topWall = mode3 === 'corte' ? Hw : Hfull - s.vcH;
    const ops = R.ops.filter(o => o.o === r.dir && Math.abs((r.dir === 'h' ? o.y : o.x) - f) < 1e-6).map(o => { const c = r.dir === 'h' ? o.x : o.y; const top = o.type === 'door' ? Math.min(o.h, topWall) : Math.min(s.winTop, topWall); const bot = o.type === 'door' ? 0 : Math.max(0, top - o.h); return {a: Math.max(u0, c - o.w / 2), b: Math.min(u1, c + o.w / 2), bot, top}; }).filter(o => o.b > o.a).sort((x, y) => x.a - y.a);
    let cur = u0;
    for (const o of ops) {
      if (o.a > cur) along(r.dir, f, cur, o.a, 0, topWall, t, wallC);
      if (o.bot > 0) along(r.dir, f, o.a, o.b, 0, o.bot, t, wallC);
      if (o.top < topWall) along(r.dir, f, o.a, o.b, o.top, topWall, t, wallC);
      cur = Math.max(cur, o.b);
    }
    if (cur < u1) along(r.dir, f, cur, u1, 0, topWall, t, wallC);
    if (mode3 !== 'corte') along(r.dir, f, u0, u1, Hfull - s.vcH, Hfull, Math.max(t, s.vcB) + 0.01, C3.beam);
  }
  for (const c of R.cols) {
    const h2 = cs / 2 + 0.006;
    box(c.x - h2, estr ? -s.vaH : 0, c.y - h2, c.x + h2, Hw + (mode3 === 'corte' ? 0 : 0.001), c.y + h2, C3.conc);
    if (estr && s.zapOn) box(c.x - s.zapL / 2, -s.vaH - 0.4 - s.zapE, c.y - s.zapL / 2, c.x + s.zapL / 2, -s.vaH - 0.4, c.y + s.zapL / 2, C3.zap);
    if (estr && s.zapOn) box(c.x - cs / 2, -s.vaH - 0.4, c.y - cs / 2, c.x + cs / 2, -s.vaH, c.y + cs / 2, C3.conc);
  }
  if (mode3 === 'full' && bb && s.techoOn) {
    const al = s.alero, p = s.pend / 100, alongX = bb.w >= bb.h;
    const x0 = bb.x - (alongX ? al : 0), x1 = bb.x + bb.w + (alongX ? al : 0), z0 = bb.y - (alongX ? 0 : al), z1 = bb.y + bb.h + (alongX ? 0 : al);
    if (alongX) {
      const zc = bb.y + bb.h / 2, Hr = Hfull + 0.06 + (bb.h / 2) * p, He = Hfull + 0.06 - al * p;
      quad([x0, He, bb.y - al], [x1, He, bb.y - al], [x1, Hr, zc], [x0, Hr, zc], [0, 1, -p], C3.roof);
      quad([x0, He, bb.y + bb.h + al], [x0, Hr, zc], [x1, Hr, zc], [x1, He, bb.y + bb.h + al], [0, 1, p], C3.roof);
      tri([bb.x, Hfull, bb.y], [bb.x, Hfull, bb.y + bb.h], [bb.x, Hr, zc], wallC); tri([bb.x + bb.w, Hfull, bb.y], [bb.x + bb.w, Hfull, bb.y + bb.h], [bb.x + bb.w, Hr, zc], wallC);
    } else {
      const xc = bb.x + bb.w / 2, Hr = Hfull + 0.06 + (bb.w / 2) * p, He = Hfull + 0.06 - al * p;
      quad([bb.x - al, He, z0], [xc, Hr, z0], [xc, Hr, z1], [bb.x - al, He, z1], [-p, 1, 0], C3.roof);
      quad([bb.x + bb.w + al, He, z0], [bb.x + bb.w + al, He, z1], [xc, Hr, z1], [xc, Hr, z0], [p, 1, 0], C3.roof);
      tri([bb.x, Hfull, bb.y], [bb.x + bb.w, Hfull, bb.y], [xc, Hr, bb.y], wallC); tri([bb.x, Hfull, bb.y + bb.h], [bb.x + bb.w, Hfull, bb.y + bb.h], [xc, Hr, bb.y + bb.h], wallC);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); nVerts = a.length / 9;
  if (bb) { cam.tx = bb.x + bb.w / 2; cam.tz = bb.y + bb.h / 2; } else { cam.tx = P.lot.w / 2; cam.tz = P.lot.h / 2; }
  cam.ty = estr ? 0.6 : 1.2;
  dirty3 = false;
  const leg = [[wallC, mampOf(P).name.split(' ').slice(0, 3).join(' ')], [C3.conc, 'Columnas'], [C3.beam, 'Vigas'], [C3.floor, 'Piso'], [C3.roof, 'Techo de zinc']];
  if (estr) leg.push([C3.zap, 'Zapatas']);
  $('#leg3').innerHTML = leg.map(([c, n]) => `<span><i style="background:rgb(${c.map(v => Math.round(v * 255)).join(',')})"></i>${esc(n)}</span>`).join('');
}
function m4mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function draw3() {
  if (!gl || !P) return;
  if (dirty3) build3();
  const c = gl.canvas, dpr = Math.min(2, window.devicePixelRatio || 1), W = c.clientWidth ? Math.round(c.clientWidth * dpr) : 1400, H = c.clientHeight ? Math.round(c.clientHeight * dpr) : 900;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  gl.viewport(0, 0, W, H); gl.clearColor(0.86, 0.92, 0.97, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const e = [cam.tx + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.ty + cam.dist * Math.sin(cam.pitch), cam.tz + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
  const sub = (u, v) => [u[0]-v[0], u[1]-v[1], u[2]-v[2]], nrm = v => { const l = Math.hypot(...v) || 1; return v.map(z => z / l); }, cr = (u, v) => [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], dt = (u, v) => u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const z = nrm(sub(e, [cam.tx, cam.ty, cam.tz])); let upv = [0, 1, 0]; if (Math.abs(z[1]) > 0.999) upv = [0, 0, -1];
  const x = nrm(cr(upv, z)), y = cr(z, x);
  const V = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dt(x, e), -dt(y, e), -dt(z, e), 1];
  const f = 1 / Math.tan(0.45), asp = W / H, n = 0.1, fr = 500;
  const Pm = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0];
  gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const loc = k => gl.getAttribLocation(prog, k);
  for (const [k, off] of [['p', 0], ['n', 12], ['c', 24]]) { const l = loc(k); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 36, off); }
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'M'), false, new Float32Array(m4mul(Pm, V)));
  const L = nrm([Math.sin(cam.yaw + 0.6), 1.3, Math.cos(cam.yaw + 0.6)]);
  gl.uniform3fv(gl.getUniformLocation(prog, 'L'), new Float32Array(L));
  gl.drawArrays(gl.TRIANGLES, 0, nVerts);
}
function setView(v) {
  const R = calc(P), bb = R.bb, size = bb ? Math.max(bb.w, bb.h) : Math.max(P.lot.w, P.lot.h);
  const V = {aerea: [0.75, 0.62, 2.5], frente: [Math.PI, 0.12, 2.2], lado: [-Math.PI / 2, 0.12, 2.2], planta: [Math.PI, 1.55, 2.2]}[v] || [0.75, 0.62, 1.9];
  cam.yaw = V[0]; cam.pitch = V[1]; cam.dist = size * V[2] + 4;
  for (const b of document.querySelectorAll('#ov3 [data-view]')) b.classList.toggle('on', b.dataset.view === v);
  draw3();
}
$('#ov3').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
$('#modes3').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; mode3 = b.dataset.mode; dirty3 = true; for (const x of document.querySelectorAll('#modes3 [data-mode]')) x.classList.toggle('on', x === b); draw3(); });
function shot3() { if (!init3()) return null; dirty3 = true; draw3(); return gl.canvas.toDataURL('image/png'); }
$('#shot3').onclick = () => { const u = shot3(); if (u) fetch(u).then(r => r.blob()).then(b => download(slug(P.name) + '-3d.png', b)); };

/* ---------- proyectos ---------- */
function thumb(m) { return m.vb ? `<svg viewBox="${m.vb.join(' ')}" preserveAspectRatio="xMidYMid meet"><path d="${m.path}" stroke="#eef5ff" stroke-width="${Math.max(m.vb[2], m.vb[3]) / 60}" stroke-linecap="square" fill="none"/></svg>` : '<span style="color:#bcd6f5;font-size:14px">Plano vacío</span>'; }
let armedDel = null;
function renderProjects() {
  const q = ($('#search').value || '').toLowerCase();
  const L = index.filter(m => !q || m.name.toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
  $('#plist').innerHTML = L.length ? L.map(m => `<article class="pc ${P && P.id === m.id ? 'cur' : ''}" data-id="${esc(m.id)}"><div class="th">${thumb(m)}</div><div class="bd"><b>${esc(m.name)}</b><span class="sub">${num(m.area)} m² · ${money0(m.total)}<br>Editado ${fdate(m.updated)}</span></div><div class="ft"><button class="pri" data-a="open">Abrir</button><button data-a="dup">Duplicar</button><button data-a="ren">Renombrar</button><button data-a="del" class="${armedDel === m.id ? 'acc' : ''}">${armedDel === m.id ? '¿Borrar? Toca otra vez' : 'Borrar'}</button></div></article>`).join('') : `<div class="empty">No hay proyectos${q ? ' con ese nombre' : ''}. Crea uno nuevo para empezar.</div>`;
}
$('#search').addEventListener('input', renderProjects);
$('#plist').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const id = b.closest('[data-id]').dataset.id, a = b.dataset.a;
  if (a === 'open') { if (openP(id)) { location.hash = 'plano'; } }
  if (a === 'dup') { const p = loadP(id); if (p) { const c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.name = p.name + ' (copia)'; c.created = c.updated = Date.now(); putP(c); renderProjects(); toast('Proyecto duplicado'); } }
  if (a === 'ren') { const card = b.closest('.pc'); const m = index.find(x => x.id === id); const bd = card.querySelector('.bd'); bd.innerHTML = `<label for="rn_${esc(id)}">Nombre</label><input id="rn_${esc(id)}" value="${esc(m.name)}" maxlength="60">`; const inp = bd.querySelector('input'); inp.focus(); inp.select(); const done = () => { const p = loadP(id); if (p) { p.name = inp.value.trim().slice(0, 60) || p.name; p.updated = Date.now(); putP(p); if (P && P.id === id) P.name = p.name; } renderProjects(); topbar(); }; inp.addEventListener('change', done); inp.addEventListener('blur', done, {once: true}); }
  if (a === 'del') {
    if (armedDel !== id) { armedDel = id; renderProjects(); setTimeout(() => { if (armedDel === id) { armedDel = null; renderProjects(); } }, 4000); return; }
    armedDel = null; LS.del('pm.p.' + id); index = index.filter(x => x.id !== id); saveIndex();
    if (P && P.id === id) { P = null; LS.del('pm.cur'); if (index[0]) openP(index[0].id); }
    renderProjects(); topbar(); toast('Proyecto borrado');
  }
});
$('#newBlank').onclick = () => { const p = blank('Proyecto ' + (index.length + 1)); if (P) p.set = {...P.set}; putP(p); openP(p.id); tool = 'room'; location.hash = 'plano'; toast('Dibuja tu primera habitación'); };
$('#newSample').onclick = () => { const p = sample(); putP(p); openP(p.id); location.hash = 'plano'; };
function importData(txt) {
  let o; try { o = JSON.parse(txt); } catch (e) { toast('El archivo no es un respaldo válido'); return; }
  let n = 0;
  const addOne = p => { if (!p || !Array.isArray(p.rooms)) return; p = norm(JSON.parse(JSON.stringify(p))); if (index.some(x => x.id === p.id)) { p.id = uid(); p.name += ' (importado)'; } if (p.prices && typeof p.prices === 'object') { for (const k in p.prices) if (!(k in prices) && p.prices[k] !== '') prices[k] = p.prices[k]; delete p.prices; savePrices(); } delete p.sample; putP(p); n++; };
  if (o && o.app === 'planonica' && Array.isArray(o.projects)) { o.projects.forEach(addOne); if (o.prices) { prices = {...o.prices, ...prices}; savePrices(); } }
  else if (o && o.app === 'planonica' && o.project) { addOne(o.project); if (o.prices) { prices = {...o.prices, ...prices}; savePrices(); } }
  else addOne(o); // respaldo del prototipo
  toast(n ? `Importado: ${n} proyecto${n > 1 ? 's' : ''}` : 'No se encontraron proyectos en el archivo');
  renderProjects();
}
$('#impFile').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => importData(rd.result); rd.readAsText(f); e.target.value = ''; };

/* ---------- presupuesto ---------- */
let lastR = null;
const pr = k => +prices[k] || 0;
function kpiHTML(R) {
  const total = R.matTotal + R.gastoTotal, bud = +P.budget || 0, spent = R.gastoTotal;
  const pct = bud ? Math.min(100, spent / bud * 100) : 0;
  return `<div class="kpi big"><span>Total estimado</span><b>${money0(total)}</b><small>Materiales ${money0(R.matTotal)} + otros gastos ${money0(R.gastoTotal)}</small></div>
  <div class="kpi"><span>Área de construcción</span><b>${num(R.Af)} m²</b><small>${num(R.Lw)} m de pared · ${R.Nc} columnas</small></div>
  <div class="kpi"><span>Costo por m²</span><b>${R.Af ? money0(total / R.Af) : '—'}</b><small>Total estimado entre área</small></div>
  <div class="kpi"><span>Gastado / presupuesto</span><b>${money0(spent)}</b><small>${bud ? `de ${money0(bud)} (${Math.round(spent / bud * 100)}%)` : 'Define tu presupuesto en Gastos'}</small>${bud ? `<div class="meter"><i style="width:${pct}%"></i></div>` : ''}</div>`;
}
function renderBars(R) {
  $('#kpis').innerHTML = kpiHTML(R);
  const mx = Math.max(1, ...R.partCost.map(x => x.c)), any = R.partCost.some(x => x.c > 0);
  const top = [...R.partCost].sort((a, b) => b.c - a.c)[0];
  $('#pbars').innerHTML = R.partCost.map(x => `<div class="r"><span>${x.n}</span><div class="b ${any && x === top ? 'a' : ''}" style="width:${any ? Math.max(1.5, x.c / mx * 100) : 1.5}%"></div><b>${any ? money0(x.c) : '—'}</b></div>`).join('');
  $('#ptip').textContent = any ? `La partida más cara es ${top.n.toLowerCase()} (${Math.round(top.c / Math.max(1, R.partCost.reduce((a, x) => a + x.c, 0)) * 100)}% de los materiales).` : 'Escribe los precios en la tabla de abajo para ver el costo por partida.';
}
function renderBudget() {
  lastR = calc(P); const R = lastR;
  renderBars(R);
  const pd = LS.get('pm.pricesDate', 0); $('#pdate').textContent = pd ? 'Precios actualizados el ' + fdate(pd) : 'Aún no has escrito precios.';
  let h = `<thead><tr><th>Material</th><th class="n">Cantidad</th><th>Unidad</th><th class="n">Precio C$</th><th class="n">Subtotal</th></tr></thead><tbody>`;
  h += R.items.map(i => `<tr><td>${esc(i.n)}</td><td class="n">${num(i.q)}</td><td>${esc(i.u)}</td><td class="n"><input type="number" min="0" step="0.01" inputmode="decimal" aria-label="Precio de ${esc(i.n)}" data-pk="${esc(i.pk)}" data-q="${i.q}" value="${prices[i.pk] ?? ''}" placeholder="0.00"></td><td class="n" data-st="${esc(i.pk)}">${money(i.q * pr(i.pk))}</td></tr>`).join('');
  h += P.custom.map(c => `<tr data-cid="${esc(c.id)}"><td><input class="t" data-cf="n" aria-label="Material" value="${esc(c.n)}" placeholder="Material" maxlength="80"></td><td class="n"><input data-cf="q" type="number" min="0" step="0.01" aria-label="Cantidad" value="${esc(c.q)}"></td><td><input class="t" data-cf="u" aria-label="Unidad" value="${esc(c.u)}" placeholder="unidad" style="max-width:110px" maxlength="20"></td><td class="n"><input data-cf="p" type="number" min="0" step="0.01" aria-label="Precio" value="${esc(c.p)}"></td><td class="n"><span data-cs="${esc(c.id)}">${money((+c.q || 0) * (+c.p || 0))}</span> <button class="xbtn" data-cdel="${esc(c.id)}" aria-label="Quitar material">✕</button></td></tr>`).join('');
  $('#mtab').innerHTML = h + '</tbody>';
  $('#dtab').innerHTML = `<thead><tr><th>Partida</th><th class="n">Cantidad</th><th>Unidad</th></tr></thead><tbody>` + R.info.map(([n, v, u]) => `<tr><td>${n}</td><td class="n">${num(r2(v))}</td><td>${u}</td></tr>`).join('') + '</tbody>';
}
$('#mtab').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.pk) { prices[t.dataset.pk] = t.value === '' ? '' : +t.value; savePrices(); const c = document.querySelector(`[data-st="${CSS.escape(t.dataset.pk)}"]`); if (c) c.textContent = money(+t.dataset.q * pr(t.dataset.pk)); }
  const row = t.closest('[data-cid]'); if (row && t.dataset.cf) { const c = P.custom.find(z => z.id === row.dataset.cid); if (c) { c[t.dataset.cf] = t.value; const s = document.querySelector(`[data-cs="${CSS.escape(c.id)}"]`); if (s) s.textContent = money((+c.q || 0) * (+c.p || 0)); } save(); }
  clearTimeout(renderBudget.t); renderBudget.t = setTimeout(() => renderBars(calc(P)), 250);
});
$('#mtab').addEventListener('change', () => { renderBars(calc(P)); const pd = LS.get('pm.pricesDate', 0); if (pd) $('#pdate').textContent = 'Precios actualizados el ' + fdate(pd); });
$('#mtab').addEventListener('click', e => { const b = e.target.closest('[data-cdel]'); if (!b) return; P.custom = P.custom.filter(c => c.id !== b.dataset.cdel); save(); renderBudget(); });
$('#addMat').onclick = () => { P.custom.push({id: uid(), n: '', u: 'unidad', q: 1, p: ''}); save(); renderBudget(); const r = document.querySelector('#mtab tr:last-child input'); if (r) r.focus(); };

/* ---------- gastos ---------- */
$('#g_c').innerHTML = CATS.map(c => `<option>${c}</option>`).join('');
$('#gform').addEventListener('submit', e => { e.preventDefault(); const m = +$('#g_m').value; if (!(m > 0)) return; P.gastos.push({id: uid(), f: $('#g_f').value, c: $('#g_c').value, d: $('#g_d').value.slice(0, 120), m}); $('#g_d').value = ''; $('#g_m').value = ''; save(); renderGastos(); toast('Gasto registrado'); });
$('#g_bud').addEventListener('change', e => { P.budget = e.target.value === '' ? '' : Math.max(0, +e.target.value); save(); renderGastos(); });
function renderGastos() {
  const R = calc(P); $('#gkpis').innerHTML = kpiHTML(R); $('#g_bud').value = P.budget ?? '';
  if (!$('#g_f').value) $('#g_f').value = today();
  const by = {}; for (const g of P.gastos) by[g.c] = (by[g.c] || 0) + (+g.m || 0);
  const mx = Math.max(1, ...Object.values(by));
  $('#gcats').innerHTML = P.gastos.length ? Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, v], i) => `<div class="r"><span>${esc(c)}</span><div class="b ${i ? '' : 'a'}" style="width:${Math.max(2, v / mx * 100)}%"></div><b>${money0(v)}</b></div>`).join('') : '<p class="sub">Aún no hay gastos registrados.</p>';
  const L = [...P.gastos].sort((a, b) => (b.f || '').localeCompare(a.f || ''));
  $('#glist').innerHTML = L.length ? `<div class="tablewrap"><table class="stack"><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="n">Monto</th><th></th></tr></thead><tbody>${L.map(g => `<tr><td style="white-space:nowrap">${esc(g.f)}</td><td>${esc(g.c)}</td><td>${esc(g.d)}</td><td class="n">${money(+g.m)}</td><td class="n"><button class="xbtn" data-gdel="${esc(g.id)}" aria-label="Borrar gasto">✕</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">Registra aquí compras, mano de obra, transporte, permisos y cualquier otro gasto de la obra.</div>`;
}
$('#glist').addEventListener('click', e => { const b = e.target.closest('[data-gdel]'); if (!b) return; P.gastos = P.gastos.filter(g => g.id !== b.dataset.gdel); save(); renderGastos(); });

/* ---------- ajustes ---------- */
function renderSet() {
  $('#setf').innerHTML = `<div class="grid2" style="margin-top:0">` + SCHEMA.map(([t, fs]) => `<div class="card"><h3>${t}</h3>${fs.map(([k, l, u]) => u === 'b' ? `<label class="chk"><input type="checkbox" data-sk="${k}" ${P.set[k] ? 'checked' : ''}>${l}</label>` : u === 'sel' ? `<label for="sk_${k}">${l}</label><select id="sk_${k}" data-sk="${k}">${Object.entries(MAMP).map(([a, v]) => `<option value="${a}" ${P.set.mamp === a ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : `<div style="margin:6px 0"><label for="sk_${k}">${l} (${u})</label><input id="sk_${k}" type="number" step="any" inputmode="decimal" data-sk="${k}" value="${P.set[k]}"></div>`).join('')}</div>`).join('') + `</div>`;
  $('#appinfo').textContent = `Versión ${APP_VERSION}. ${index.length} proyecto${index.length === 1 ? '' : 's'} guardado${index.length === 1 ? '' : 's'} en este dispositivo. ${navigator.serviceWorker && navigator.serviceWorker.controller ? 'Lista para usar sin internet.' : 'El modo sin internet se activa al abrirla desde su dirección web.'}`;
}
$('#setf').addEventListener('change', e => { const k = e.target.dataset.sk; if (!k) return; if (e.target.type === 'checkbox') P.set[k] = e.target.checked; else if (k === 'mamp') P.set[k] = e.target.value; else { const v = parseFloat(e.target.value); if (isFinite(v) && v >= 0) P.set[k] = v; else e.target.value = P.set[k]; } dirty3 = true; save(); });
$('#resetSet').onclick = () => { P.set = {...DEF, mamp: P.set.mamp, H: P.set.H}; dirty3 = true; save(); renderSet(); toast('Valores típicos restablecidos'); };

/* ---------- exportar ---------- */
function rowsMat() { const R = calc(P); return [...R.items.map(i => ({n: i.n, q: i.q, u: i.u, p: pr(i.pk)})), ...P.custom.filter(c => c.n).map(c => ({n: c.n, q: +c.q || 0, u: c.u, p: +c.p || 0}))]; }
const csvCell = v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
function planPNG(cb) {
  const s = planSVG(P, 'bp', 60), img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); c.toBlob(cb, 'image/png'); };
  img.onerror = () => toast('No se pudo crear la imagen');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}
$('#x_plan').onclick = () => planPNG(b => download(slug(P.name) + '-plano.png', b));
$('#x_3d').onclick = () => { const prevMode = mode3; mode3 = 'full'; const sv = {...cam}; const ok = init3(); if (!ok) return; dirty3 = true; build3(); setView('aerea'); const u = gl.canvas.toDataURL('image/png'); Object.assign(cam, sv); mode3 = prevMode; dirty3 = true; fetch(u).then(r => r.blob()).then(b => download(slug(P.name) + '-3d.png', b)); };
$('#x_csvm').onclick = () => { const L = rowsMat(); const R = calc(P); download(slug(P.name) + '-materiales.csv', new Blob([csv([['Material', 'Cantidad', 'Unidad', 'Precio C$', 'Subtotal C$'], ...L.map(l => [l.n, l.q, l.u, l.p, r2(l.q * l.p)]), [], ['Total materiales', '', '', '', r2(R.matTotal)]])], {type: 'text/csv;charset=utf-8'})); };
$('#x_csvg').onclick = () => { download(slug(P.name) + '-gastos.csv', new Blob([csv([['Fecha', 'Categoría', 'Descripción', 'Monto C$'], ...[...P.gastos].sort((a, b) => (a.f || '').localeCompare(b.f || '')).map(g => [g.f, g.c, g.d, g.m]), [], ['Total', '', '', r2(P.gastos.reduce((a, g) => a + (+g.m || 0), 0))]])], {type: 'text/csv;charset=utf-8'})); };
$('#x_json').onclick = () => download(slug(P.name) + '.planonica.json', new Blob([JSON.stringify({app: 'planonica', version: APP_VERSION, exported: Date.now(), project: P, prices})], {type: 'application/json'}));
$('#x_all').onclick = () => { const all = index.map(m => loadP(m.id)).filter(Boolean); download('planonica-respaldo-' + today() + '.json', new Blob([JSON.stringify({app: 'planonica', version: APP_VERSION, exported: Date.now(), projects: all, prices})], {type: 'application/json'})); };
$('#x_share').onclick = async () => {
  const R = calc(P), L = rowsMat();
  const txt = `${P.name}\nÁrea: ${num(R.Af)} m² · Paredes de ${mampOf(P).name}\n\nMateriales:\n` + L.map(l => `• ${l.n}: ${num(l.q)} ${l.u}${l.p ? ' — ' + money(l.q * l.p) : ''}`).join('\n') + `\n\nMateriales: ${money(R.matTotal)}\nOtros gastos: ${money(R.gastoTotal)}\nTotal estimado: ${money(R.matTotal + R.gastoTotal)}`;
  try { if (navigator.share) { await navigator.share({title: P.name, text: txt}); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(txt); toast('Resumen copiado'); } catch (e) { download(slug(P.name) + '-resumen.txt', new Blob([txt], {type: 'text/plain'})); }
};
$('#x_pdf').onclick = () => {
  const R = calc(P), L = rowsMat(), img3 = (() => { try { const sv = {...cam}, pm = mode3; mode3 = 'full'; if (!init3()) return ''; dirty3 = true; build3(); setView('aerea'); const u = gl.canvas.toDataURL('image/png'); Object.assign(cam, sv); mode3 = pm; dirty3 = true; return u; } catch (e) { return ''; } })();
  const tbl = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i && typeof c === 'string' && c.startsWith('C$') ? ' style="text-align:right"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('#print').innerHTML = `<h1>${esc(P.name)}</h1><p>Generado el ${fdate(Date.now())} con PlanoNica · Paredes de ${esc(mampOf(P).name)} · Altura ${num(P.set.H)} m</p>
  ${tbl(['Área de piso', 'Paredes', 'Columnas', 'Total estimado', 'Costo por m²'], [[num(R.Af) + ' m²', num(R.Lw) + ' m', R.Nc, money(R.matTotal + R.gastoTotal), R.Af ? money((R.matTotal + R.gastoTotal) / R.Af) : '—']])}
  <h2>Plano</h2>${planSVG(P, 'print', 40)}
  ${img3 ? `<h2 class="pg">Vista 3D</h2><img src="${img3}" alt="Vista 3D">` : ''}
  <h2 class="pg">Materiales</h2>${tbl(['Material', 'Cantidad', 'Unidad', 'Precio', 'Subtotal'], L.map(l => [esc(l.n), num(l.q), esc(l.u), l.p ? money(l.p) : '—', money(l.q * l.p)]))}
  <p><b>Total materiales: ${money(R.matTotal)}</b></p>
  <h2>Costo por partida</h2>${tbl(['Partida', 'Costo'], R.partCost.map(x => [x.n, money(x.c)]))}
  <h2>Otros gastos</h2>${P.gastos.length ? tbl(['Fecha', 'Categoría', 'Descripción', 'Monto'], [...P.gastos].sort((a, b) => (a.f || '').localeCompare(b.f || '')).map(g => [esc(g.f), esc(g.c), esc(g.d), money(+g.m)])) : '<p>Sin gastos registrados.</p>'}
  <p><b>Total otros gastos: ${money(R.gastoTotal)}</b></p>
  <h2>Desglose</h2>${tbl(['Partida', 'Cantidad', 'Unidad'], R.info.map(([n, v, u]) => [n, num(r2(v)), u]))}
  <p style="font-size:9pt;color:#555">Estimación para presupuesto. Columnas, vigas y acero deben revisarse con un ingeniero según el Reglamento Nacional de Construcción.</p>`;
  setTimeout(() => { try { window.print(); } catch (e) { toast('Tu navegador no permite imprimir desde aquí'); } }, 300);
};

/* ---------- navegación ---------- */
const VIEWS = ['proyectos', 'plano', '3d', 'presupuesto', 'gastos', 'exportar', 'ajustes'];
function topbar() { $('#topName').innerHTML = P ? `${esc(P.name)}<small>${esc(mampOf(P).name)}</small>` : 'PlanoNica<small>Planos y materiales</small>'; }
function show() {
  let v = (location.hash || '#proyectos').slice(1); if (!VIEWS.includes(v)) v = 'proyectos';
  if (v !== 'proyectos' && !P) v = 'proyectos';
  for (const s of document.querySelectorAll('main>.view')) s.classList.toggle('on', s.id === 'v-' + v);
  for (const a of document.querySelectorAll('nav.bot a')) a.classList.toggle('on', a.dataset.v === v);
  topbar();
  if (v === 'proyectos') renderProjects();
  if (v === 'plano') renderPlan();
  if (v === '3d') { if (init3()) { dirty3 = true; requestAnimationFrame(() => { if (!cam.set) { setView('aerea'); cam.set = 1; } else draw3(); }); } }
  if (v === 'presupuesto') renderBudget();
  if (v === 'gastos') renderGastos();
  if (v === 'ajustes') renderSet();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', show);
$('#goExp').onclick = () => { location.hash = P ? 'exportar' : 'proyectos'; };
$('#goSet').onclick = () => { location.hash = P ? 'ajustes' : 'proyectos'; };
window.addEventListener('pagehide', () => { if (P) { clearTimeout(saveT); putP(P); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && P) { clearTimeout(saveT); putP(P); } });

/* ---------- sin internet y actualizaciones ---------- */
function net() { const on = navigator.onLine; const b = $('#net'); b.textContent = on ? 'En línea' : 'Sin internet'; b.classList.toggle('off', !on); }
window.addEventListener('online', net); window.addEventListener('offline', net); net();
let waitingSW = null;
function showUpd(w) { waitingSW = w; $('#upd').classList.add('on'); }
$('#updBtn').onclick = () => { if (waitingSW) waitingSW.postMessage('SKIP_WAITING'); else location.reload(); };
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; if (P) putP(P); location.reload(); });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpd(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpd(w); }); });
      $('#chkUpd').onclick = () => { if (!navigator.onLine) { toast('Necesitas internet para buscar actualizaciones'); return; } reg.update().then(() => { if (!reg.waiting && !reg.installing) toast('Ya tienes la última versión'); }).catch(() => toast('No se pudo buscar ahora')); };
      setInterval(() => { if (navigator.onLine) reg.update().catch(() => {}); }, 60 * 60 * 1000);
    }).catch(() => { $('#chkUpd').onclick = () => toast('Las actualizaciones automáticas funcionan cuando la app está instalada desde su dirección web'); });
  });
} else $('#chkUpd').onclick = () => toast('Este navegador no admite el modo sin internet');

// primer uso
if (!index.length) { const s = sample(); putP(s); }
{ const cur = LS.get('pm.cur', null); if (cur && index.some(x => x.id === cur)) openP(cur); else if (index[0]) openP(index[0].id); }
show();
})();
