// A*-Wegfindung auf dem Tile-Raster (4 Richtungen), für NPCs
export function findPath(map, sx, sy, tx, ty, maxNodes = 7000) {
  if (map.npcBlocked(tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  const W = map.w;
  const start = sy * W + sx, goal = ty * W + tx;
  const g = new Map([[start, 0]]);
  const came = new Map();
  const heap = [[Math.abs(sx - tx) + Math.abs(sy - ty), start]];
  const closed = new Set();
  let n = 0;
  while (heap.length) {
    const [, cur] = heapPop(heap);
    if (cur === goal) break;
    if (closed.has(cur)) continue;
    closed.add(cur);
    if (++n > maxNodes) return null;
    const cx = cur % W, cy = (cur - cx) / W;
    const gc = g.get(cur);
    for (let d = 0; d < 4; d++) {
      const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0);
      const ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (map.npcBlocked(nx, ny)) continue;
      const ni = ny * W + nx;
      const ng = gc + 1;
      if (ng < (g.get(ni) ?? Infinity)) {
        g.set(ni, ng);
        came.set(ni, cur);
        heapPush(heap, [ng + Math.abs(nx - tx) + Math.abs(ny - ty), ni]);
      }
    }
  }
  if (!came.has(goal)) return null;
  const path = [];
  let c = goal;
  while (c !== start) { path.push({ x: c % W, y: Math.floor(c / W) }); c = came.get(c); }
  return path.reverse();
}

function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}

function heapPop(h) {
  const top = h[0];
  const last = h.pop();
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]];
      i = m;
    }
  }
  return top;
}
