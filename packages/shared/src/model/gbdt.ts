/**
 * Pure-TypeScript evaluator for the LightGBM models Pavana serves, plus exact path-dependent
 * TreeSHAP (Lundberg et al. 2018), ported from LightGBM's own `Tree::PredictContrib`.
 *
 * Models arrive in the compact `pavana-gbdt-v1` format written by
 * `ml/src/pavana_ml/models/export.py` from `Booster.dump_model()`. Parity with Python
 * `predict(raw_score=True)` and `predict(pred_contrib=True)` is pinned by recorded vectors in
 * `fixtures/test-vectors/gbdt-*.json`; change this file and the exporter together.
 *
 * Only numerical splits are supported (the exporter refuses categorical ones).
 */

/** One tree. Internal nodes are indexed 0..n-1; a child < 0 is the leaf `~child`. */
export interface GbdtTree {
  /** Split feature index per internal node. */
  f: number[];
  /** Threshold per internal node (go left when value <= threshold). */
  t: number[];
  /** Flags per internal node: bit 0 default-left, bits 1–2 missing type (0 none, 1 zero, 2 NaN). */
  d: number[];
  l: number[];
  r: number[];
  /** Training rows reaching each internal node (TreeSHAP cover). */
  ic: number[];
  /** Leaf outputs (raw score). */
  v: number[];
  /** Training rows reaching each leaf. */
  lc: number[];
}

export interface GbdtModel {
  format: 'pavana-gbdt-v1';
  objective: 'binary';
  featureNames: string[];
  trees: GbdtTree[];
}

const ZERO_THRESHOLD = 1e-35;
const MISSING_ZERO = 1;
const MISSING_NAN = 2;

function decide(tree: GbdtTree, node: number, raw: number | null): number {
  let x = raw === null ? Number.NaN : raw;
  const flags = tree.d[node]!;
  const missing = (flags >> 1) & 3;
  if (Number.isNaN(x) && missing !== MISSING_NAN) x = 0;
  if (
    (missing === MISSING_ZERO && x >= -ZERO_THRESHOLD && x <= ZERO_THRESHOLD) ||
    (missing === MISSING_NAN && Number.isNaN(x))
  ) {
    return flags & 1 ? tree.l[node]! : tree.r[node]!;
  }
  return x <= tree.t[node]! ? tree.l[node]! : tree.r[node]!;
}

function leafOf(tree: GbdtTree, x: readonly (number | null)[]): number {
  if (tree.f.length === 0) return 0;
  let node = 0;
  while (node >= 0) node = decide(tree, node, x[tree.f[node]!] ?? null);
  return ~node;
}

/** Raw score (log-odds for a binary model). `null` / NaN inputs follow the learned missing branch. */
export function predictRaw(model: GbdtModel, x: readonly (number | null)[]): number {
  let s = 0;
  for (const tree of model.trees) s += tree.v[leafOf(tree, x)]!;
  return s;
}

export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

export function predictProba(model: GbdtModel, x: readonly (number | null)[]): number {
  return sigmoid(predictRaw(model, x));
}

// ---------------------------------------------------------------- TreeSHAP

interface PathElement {
  feature: number;
  zero: number;
  one: number;
  w: number;
}

function extendPath(path: PathElement[], depth: number, zero: number, one: number, feature: number) {
  path[depth] = { feature, zero, one, w: depth === 0 ? 1 : 0 };
  for (let i = depth - 1; i >= 0; i--) {
    path[i + 1]!.w += (one * path[i]!.w * (i + 1)) / (depth + 1);
    path[i]!.w = (zero * path[i]!.w * (depth - i)) / (depth + 1);
  }
}

function unwindPath(path: PathElement[], depth: number, index: number) {
  const { one, zero } = path[index]!;
  let next = path[depth]!.w;
  for (let i = depth - 1; i >= 0; i--) {
    if (one !== 0) {
      const tmp = path[i]!.w;
      path[i]!.w = (next * (depth + 1)) / ((i + 1) * one);
      next = tmp - (path[i]!.w * zero * (depth - i)) / (depth + 1);
    } else {
      path[i]!.w = (path[i]!.w * (depth + 1)) / (zero * (depth - i));
    }
  }
  for (let i = index; i < depth; i++) {
    path[i]!.feature = path[i + 1]!.feature;
    path[i]!.zero = path[i + 1]!.zero;
    path[i]!.one = path[i + 1]!.one;
  }
}

function unwoundPathSum(path: PathElement[], depth: number, index: number): number {
  const { one, zero } = path[index]!;
  let next = path[depth]!.w;
  let total = 0;
  for (let i = depth - 1; i >= 0; i--) {
    if (one !== 0) {
      const tmp = (next * (depth + 1)) / ((i + 1) * one);
      total += tmp;
      next = path[i]!.w - tmp * zero * ((depth - i) / (depth + 1));
    } else {
      total += path[i]!.w / zero / ((depth - i) / (depth + 1));
    }
  }
  return total;
}

const cover = (tree: GbdtTree, node: number) => (node >= 0 ? tree.ic[node]! : tree.lc[~node]!);

function treeShap(
  tree: GbdtTree,
  x: readonly (number | null)[],
  phi: number[],
  node: number,
  depth: number,
  parent: PathElement[],
  zero: number,
  one: number,
  feature: number,
) {
  const path = parent.slice(0, depth).map((p) => ({ ...p }));
  extendPath(path, depth, zero, one, feature);

  if (node < 0) {
    const value = tree.v[~node]!;
    for (let i = 1; i <= depth; i++) {
      const w = unwoundPathSum(path, depth, i);
      const el = path[i]!;
      phi[el.feature]! += w * (el.one - el.zero) * value;
    }
    return;
  }

  const split = tree.f[node]!;
  const hot = decide(tree, node, x[split] ?? null);
  const cold = hot === tree.l[node] ? tree.r[node]! : tree.l[node]!;
  const w = cover(tree, node);
  let inZero = 1;
  let inOne = 1;
  let d = depth;
  let k = 0;
  for (; k <= d; k++) if (path[k]!.feature === split) break;
  if (k !== d + 1) {
    inZero = path[k]!.zero;
    inOne = path[k]!.one;
    unwindPath(path, d, k);
    d -= 1;
  }
  treeShap(tree, x, phi, hot, d + 1, path, (cover(tree, hot) / w) * inZero, inOne, split);
  treeShap(tree, x, phi, cold, d + 1, path, (cover(tree, cold) / w) * inZero, 0, split);
}

function expectedValue(tree: GbdtTree): number {
  if (tree.f.length === 0) return tree.v[0]!;
  const total = tree.ic[0]!;
  let e = 0;
  for (let i = 0; i < tree.v.length; i++) e += (tree.lc[i]! / total) * tree.v[i]!;
  return e;
}

/**
 * SHAP contributions in raw-score (log-odds) space: one value per feature plus the expected
 * value last, exactly like LightGBM `pred_contrib`. They sum to `predictRaw(model, x)`.
 * This attributes the *model's* output; it is not evidence that a feature causes fires or haze.
 */
export function shapContributions(model: GbdtModel, x: readonly (number | null)[]): number[] {
  const n = model.featureNames.length;
  const phi = new Array<number>(n + 1).fill(0);
  for (const tree of model.trees) {
    phi[n]! += expectedValue(tree);
    if (tree.f.length > 0) treeShap(tree, x, phi, 0, 0, [], 1, 1, -1);
  }
  return phi;
}

export interface Contribution {
  feature: string;
  value: number | null;
  /** Log-odds contribution. Positive pushes the probability up. */
  shap: number;
}

/** Contributions sorted by absolute size, largest first. */
export function rankContributions(
  model: GbdtModel,
  x: readonly (number | null)[],
  phi: readonly number[] = shapContributions(model, x),
): Contribution[] {
  return model.featureNames
    .map((feature, i) => {
      const v = x[i];
      return {
        feature,
        value: v === null || v === undefined || Number.isNaN(v) ? null : v,
        shap: phi[i]!,
      };
    })
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
}
