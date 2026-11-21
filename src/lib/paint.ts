// Hand-painted look without image filters (react-native-svg has no turbulence filter):
// shapes are turned into point lists, nudged a little at random, and joined with soft curves.
// Drawing the same shape twice with different wobble gives the layered watercolor edge.

import type { Rng } from './random';

export type Pt = [number, number];

/** Adds extra points so no segment is longer than `maxLen` (more points = more wobble). */
export function densify(points: Pt[], maxLen = 10, closed = true): Pt[] {
  const out: Pt[] = [];
  const n = points.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    out.push(a);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.floor(len / maxLen);
    for (let k = 1; k <= steps; k++) {
      const t = k / (steps + 1);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

/** Random nudge of every point, then a smooth curve through the midpoints. */
export function wobblePath(points: Pt[], amp: number, rng: Rng, closed = true): string {
  const p = points.map(([x, y]) => [x + (rng() - 0.5) * 2 * amp, y + (rng() - 0.5) * 2 * amp] as Pt);
  const n = p.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (v: number) => v.toFixed(1);
  if (closed) {
    const start = mid(p[n - 1], p[0]);
    let d = `M${f(start[0])} ${f(start[1])}`;
    for (let i = 0; i < n; i++) {
      const m = mid(p[i], p[(i + 1) % n]);
      d += `Q${f(p[i][0])} ${f(p[i][1])} ${f(m[0])} ${f(m[1])}`;
    }
    return d + 'Z';
  }
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < n - 1; i++) {
    const m = mid(p[i], p[i + 1]);
    d += `Q${f(p[i][0])} ${f(p[i][1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + `L${f(p[n - 1][0])} ${f(p[n - 1][1])}`;
}

export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n = 16): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

export function rrectPts(x: number, y: number, w: number, h: number, r: number, seg = 3): Pt[] {
  const rr = Math.max(0.5, Math.min(r, w / 2, h / 2));
  const corners: [number, number, number, number][] = [
    [x + w - rr, y + rr, -90, 0],
    [x + w - rr, y + h - rr, 0, 90],
    [x + rr, y + h - rr, 90, 180],
    [x + rr, y + rr, 180, 270],
  ];
  const pts: Pt[] = [];
  for (const [cx, cy, a0, a1] of corners) {
    for (let k = 0; k <= seg; k++) {
      const a = ((a0 + ((a1 - a0) * k) / seg) * Math.PI) / 180;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  }
  return densify(pts, 10);
}

/** A filled ground/hill shape: a wavy top line from x=-10 to x=210, closed down to `bottom`. */
export function hillPts(rng: Rng, baseY: number, wave: number, bottom = 230): Pt[] {
  const pts: Pt[] = [];
  const phase = rng() * Math.PI * 2;
  for (let x = -10; x <= 210; x += 14) {
    pts.push([x, baseY + Math.sin(x / 38 + phase) * wave + (rng() - 0.5) * wave * 0.6]);
  }
  pts.push([210, bottom], [-10, bottom]);
  return pts;
}

/** A loose brush stroke: an open, slightly wavy line. */
export function strokePath(rng: Rng, x1: number, y1: number, x2: number, y2: number, amp = 1.5): string {
  return wobblePath(densify([[x1, y1], [x2, y2]], 8, false), amp, rng, false);
}
