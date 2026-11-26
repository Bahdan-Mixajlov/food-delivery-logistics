const BIG = 1e6;

export const solveAssignment = (costMatrix) => {
  if (!Array.isArray(costMatrix) || costMatrix.length === 0) return [];
  const rows = costMatrix.length;
  const cols = costMatrix[0]?.length ?? 0;
  if (cols === 0) return [];

  const size = Math.max(rows, cols);
  const a = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) =>
      i < rows && j < cols && Number.isFinite(costMatrix[i][j])
        ? costMatrix[i][j]
        : BIG,
    ),
  );

  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= size; j += 1) {
        if (used[j]) continue;
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= size; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const assignment = new Array(rows).fill(-1);
  for (let j = 1; j <= size; j += 1) {
    const row = p[j] - 1;
    const col = j - 1;
    if (row >= 0 && row < rows && col < cols) assignment[row] = col;
  }
  return assignment;
};

export const solveSingle = (row) => {
  if (!row || row.length === 0) return -1;
  let best = -1;
  let bestCost = Infinity;
  row.forEach((cost, index) => {
    if (Number.isFinite(cost) && cost < bestCost) {
      bestCost = cost;
      best = index;
    }
  });
  return best;
};
