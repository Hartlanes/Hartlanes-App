import type { EventItem } from './data';

export const TOP_PAD = 150;
// One full turn of the Timelane every 240 px.
export const TWIST = (2 * Math.PI) / 240;
export const AXIS = 40;
export const EVENT_FONT = 10;
// Timelane bubbles are one size smaller than the event universe.
export const LANE_SCALE = 0.78;
export const COLORS = {
  bg: '#232428', stemDark: '#7a1414', stemMid: '#c93b3b', stemLight: '#ffb4a8',
  upcoming: { hi: '#ffd6cc', base: '#ea5a52', dark: '#7d1616' },
  past: { hi: '#e9aaa2', base: '#aa2c2c', dark: '#4a0b0b' },
};
// Category palettes (b19 test): boat festivals purple with a red glow, snow and water sports frost, opera and theatre velvet red.
const CAT = {
  boat: { upcoming: { hi: '#b4c8f7', base: '#3f66c4', dark: '#1b3478' }, past: { hi: '#8399d6', base: '#2f4d96', dark: '#121f4a' } },
  snow: { upcoming: { hi: '#f4c6ec', base: '#9b3fae', dark: '#431255' }, past: { hi: '#c99ac8', base: '#6e2a80', dark: '#2a0a38' } },
  opera: { upcoming: { hi: '#d96a6a', base: '#8a1626', dark: '#35050d' }, past: { hi: '#a85050', base: '#5e1019', dark: '#26040a' } },
} as const;
export function paletteOf(ev: { cat?: string; status: string }) {
  const k = ev.status === 'past' ? 'past' : 'upcoming';
  const c = ev.cat && (CAT as any)[ev.cat];
  return c ? c[k] : COLORS[k];
}

// Main bubble: the biggest event is about 1.4 times the smallest.
export const mainRadius = (attendance: number) => 30 + 12 * Math.min(1, Math.sqrt(attendance / 80000));
// Timelane size tiers (b19): under 1000 a small ball with 2 small satellites, up to 10500 about Iggy Pop, up to 100000 stadium size
// (Werchter at 80k sits here), and above that (Glastonbury) one step bigger.
export const TIER_A = 1000;
export const TIER_B = 10500;
export const TIER_C = 100000;
export function laneRadius(att: number) {
  if (att < TIER_A) return 20;
  if (att <= TIER_B) return 25;
  if (att <= TIER_C) return 30;
  return 35;
}

function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Buds step down in size from big to medium-small and never get tiny.
// A seeded shuffle gives each cluster its own order, so every cluster looks different.
function seedOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

export function budSpecs(id: string, n: number, r: number, gal = false) {
  const h = seedOf(id);
  const slots = Array.from({ length: n }, (_, j) => j);
  for (let j = n - 1; j > 0; j--) {
    const k = Math.floor(rnd(h + j * 5.7) * (j + 1));
    const t = slots[j]; slots[j] = slots[k]; slots[k] = t;
  }
  // At most two bubbles may sit over the edge of the main bubble, so the name stays readable.
  const tuckA = Math.floor(rnd(h + 101) * n);
  const tuckB = (tuckA + Math.floor(n / 2)) % n;
  return Array.from({ length: n }, (_, j) => {
    const t = n > 1 ? j / (n - 1) : 0;
    const sr = gal ? Math.max(24, r * (0.62 - 0.2 * t)) : Math.max(9, r * (0.52 - 0.18 * t));
    const slot = slots[j];
    const tuck = n >= 4 && (j === tuckA || (n >= 6 && j === tuckB));
    const ring = tuck ? r + sr * 0.5 : r + sr + sr * (0.1 + rnd(h + j * 4.3) * 0.9);
    const a0 = (slot / n) * Math.PI * 2 + (rnd(h + j * 3.1) - 0.5) * (Math.PI * 2 / n) * 0.9;
    return { sr, ring, a0, w: rnd(h + j * 1.9) * 6.283, tuck };
  });
}

// The stem winds unevenly: some swirls are tight, some wide, and some wider than others.
export function thetaAt(wy: number) {
  'worklet';
  return TWIST * wy + 0.9 * Math.sin(wy / 170) + 0.5 * Math.sin(wy / 61 + 1);
}
export function axisAt(wy: number) {
  'worklet';
  return AXIS * (1 + 0.4 * Math.sin(wy / 137 + 2));
}

// Timelane satellites are only a symbolic hint of the event universe: between 2 and 5 small bubbles next to the main one.
// For now the count is seeded per event. Later it will follow what has been added to the event (friends, tickets, trip...),
// and each satellite will take a colour for its perk.
export const LANE_MIN = 2;
export const LANE_MAX = 5;
export function laneCount(ev: EventItem) {
  if (ev.attendance < TIER_A) return 2;
  return LANE_MIN + Math.floor(rnd(seedOf(ev.id) + 53) * (LANE_MAX - LANE_MIN + 1));
}

// Satellites sit in one to three loose groups at random angles round the main bubble, so one event may have two
// together low-left, the next two high-right and one left of centre, or all on one side. The whole set turns together.
export function laneBuds(id: string, n: number, r: number) {
  const h = seedOf(id);
  const groups = Math.min(n, 1 + Math.floor(rnd(h + 7) * 3));
  const base = rnd(h + 13) * Math.PI * 2;
  const gA: number[] = [];
  const gW: number[] = [];
  for (let g = 0; g < groups; g++) {
    gA.push(base + g * ((Math.PI * 2) / groups) * (0.45 + 0.55 * rnd(h + 17 + g * 3)));
    gW.push(rnd(h + 29 + g * 5) * 6.283);
  }
  const members: number[][] = Array.from({ length: groups }, () => []);
  for (let j = 0; j < n; j++) members[j % groups].push(j);
  const tuckA = n >= 4 ? Math.floor(rnd(h + 101) * n) : -1;
  const out: { sr: number; ring: number; a0: number; w: number; tuck: boolean }[] = new Array(n);
  members.forEach((ms, g) => {
    ms.forEach((j, k) => {
      const t = n > 1 ? j / (n - 1) : 0;
      const sr = Math.max(r < 22 ? 6 : 9, r * (0.52 - 0.18 * t) * (r < 22 ? 0.8 : 1));
      const tuck = j === tuckA;
      const ring = tuck ? r + sr * 0.5 : r + sr + sr * (0.1 + rnd(h + j * 4.3) * 0.9);
      const a0 = gA[g] + (k - (ms.length - 1) / 2) * 0.72 + (rnd(h + j * 3.1) - 0.5) * 0.18;
      // Members of one group share the wobble phase, so they stay apart as they drift.
      out[j] = { sr, ring, a0, w: gW[g] + k * 0.15, tuck };
    });
  });
  return out;
}

export function geom(ev: EventItem, i: number) {
  const r = laneRadius(ev.attendance);
  const specs = laneBuds(ev.id, laneCount(ev), r);
  const ext = Math.max(r, ...specs.map((s) => (s.ring + s.sr) * 1.08)) + 4;
  const h = rnd(seedOf(ev.id) + 11);
  // Every event sits at its own distance from the stem.
  return { r, D: r * 0.9 + 10 + h * 62, beta: (i % 2 === 0 ? 1 : -1) * (1.2 + (i % 3) * 0.25), ext, specs, dir: 1 };
}

export function yPositions(events: EventItem[]) {
  const ys: number[] = [];
  let acc = TOP_PAD + 40;
  let prev = 0;
  events.forEach((e, i) => {
    const ext = geom(e, i).ext;
    if (i > 0) acc += (prev + ext) * 0.78 + 12;
    prev = ext;
    ys.push(acc);
  });
  return ys;
}

// The date rail is only as wide as a month and a four digit year (about 44 px). A main bubble never covers it, but it may come right up to it,
// and where its orbit would carry it further left it lingers a little (a soft stop) instead of snapping against a wall. Satellites may overlap the rail.
export const RAIL_W = 44;
const SOFT = 22;
export function posAt(wy: number, scrollY: number, phase: number, g: { D: number; beta: number; ext: number; r?: number }, width: number) {
  'worklet';
  const th = thetaAt(wy) + phase;
  const ax = axisAt(wy);
  const zz = (ax * Math.cos(th) + g.D * Math.cos(th + g.beta)) / (ax + g.D);
  const stx = width / 2 + ax * Math.sin(th);
  const raw = stx + g.D * Math.sin(th + g.beta);
  const m = g.ext * 0.7;
  const mL = Math.max(m, RAIL_W + (g.r || 0));
  const soft = raw >= mL + SOFT ? raw : mL + SOFT * Math.exp((raw - mL - SOFT) / SOFT);
  const x = Math.min(soft, width - m);
  const s = 0.8 + 0.2 * (zz * 0.5 + 0.5);
  return { x, y: wy - scrollY, zz, s, side: Math.sin(th + g.beta), away: x >= stx ? 1 : -1, dx: x - stx };
}

// Timelane names: one word per line (at most three lines), so the bubble can stay small.
export function laneLines(title: string): string[] {
  const w = title.split(' ').filter(Boolean);
  if (w.length <= 3) return w.length ? w : [title];
  return [w[0], w[1], w.slice(2).join(' ')];
}

export function wrapTitle(title: string): string[] {
  const words = title.split(' ');
  if (words.length < 2 || title.length <= 9) return [title];
  let best: string[] = [title];
  let bd = 1e9;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' ');
    const b = words.slice(k).join(' ');
    const d = Math.abs(a.length - b.length);
    if (d < bd) { bd = d; best = [a, b]; }
  }
  return best;
}

// Spread the events evenly round the stem (golden angle), so they never all end up on one side.
export function placeAround<T extends { beta: number }>(gs: T[], ys: number[]): T[] {
  return gs.map((g, i) => ({ ...g, beta: i * 2.399963 - thetaAt(ys[i]) }));
}

// Event universe layout: every bubble gets its own distance from the main ball and its own size (core bubbles bigger,
// extras smaller). Positions come from a small relaxation so no two bubbles ever touch, and the whole cluster then turns
// as ONE rigid body, so bubbles never move against each other and never overlap. Angles and distances are irregular,
// so it reads as an organic cloud, not a star or a triangle.
const CORE = ['Artists', 'Venue', 'Organiser', 'Tickets', "Who's going", 'Who went', 'Memorabilia'];
export type CosSpec = { sr: number; ring: number; a0: number; w: number };
export function cosmosLayout(id: string, labels: string[], R0: number, halfW: number) {
  const h = seedOf(id);
  const n = labels.length;
  const rMax = halfW - 6;
  const gap = 12;
  let best: { x: number; y: number; sr: number }[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    const k = 1 - 0.06 * attempt;
    const R = R0 * Math.min(1, k + 0.12);
    const sr = labels.map((l, i) => (CORE.includes(l) ? 31 : 24.5) * (0.9 + 0.2 * rnd(h + i * 2.3)) * k);
    const p = labels.map((_, i) => {
      const a = i * 2.399963 + rnd(h + i * 7.7) * 1.4;
      const lo = R + sr[i] + gap;
      const hi = Math.max(lo, rMax - sr[i]);
      const d = lo + (hi - lo) * (0.15 + 0.7 * rnd(h + i * 3.3));
      return { x: d * Math.cos(a), y: d * Math.sin(a), sr: sr[i] };
    });
    let worst = 0;
    for (let it = 0; it < 400; it++) {
      worst = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = p[j].x - p[i].x; const dy = p[j].y - p[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const need = p[i].sr + p[j].sr + gap;
          if (d < need) {
            const m = (need - d) / 2 + 0.01; const ux = dx / d; const uy = dy / d;
            p[i].x -= ux * m; p[i].y -= uy * m; p[j].x += ux * m; p[j].y += uy * m;
            worst = Math.max(worst, need - d);
          }
        }
        const d0 = Math.sqrt(p[i].x * p[i].x + p[i].y * p[i].y) || 0.01;
        const lo = R + p[i].sr + gap; const hi = rMax - p[i].sr;
        const dd = Math.min(Math.max(d0, lo), Math.max(lo, hi));
        if (Math.abs(dd - d0) > 0.001) { worst = Math.max(worst, Math.abs(dd - d0)); p[i].x *= dd / d0; p[i].y *= dd / d0; }
      }
      if (worst < 0.2) break;
    }
    best = p;
    if (worst < 0.6) return { specs: finish(best, h), R };
  }
  return { specs: finish(best, h), R: R0 * 0.7 };
}
function finish(p: { x: number; y: number; sr: number }[], h: number): CosSpec[] {
  return p.map((q, i) => ({ sr: q.sr, ring: Math.sqrt(q.x * q.x + q.y * q.y), a0: Math.atan2(q.y, q.x), w: rnd(h + i * 1.9) * 6.283 }));
}
// Position of a bubble when the whole cluster has turned by `rot`. A tiny breathing offset keeps it alive without ever closing the gaps (gaps are 12 px, breathing is 2.5 px).
export function cosPos(sp: { ring: number; a0: number; w: number }, rot: number) {
  'worklet';
  const a = sp.a0 + rot;
  const rr = sp.ring + 2.5 * Math.sin(rot * 9 + sp.w);
  return { x: rr * Math.cos(a), y: rr * Math.sin(a) };
}
