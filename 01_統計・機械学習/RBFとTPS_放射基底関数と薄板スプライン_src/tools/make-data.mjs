// make-data.mjs — 第8章（説明変数が3つ以上）の実験を計算して js/multi-data.js に書く。node tools/make-data.mjs
// 点が多く繰り返しもあるので、ページを開くたびには計算せず、結果の数値だけをページに読み込ませる。
// データは乱数（種を固定）で作った説明用のもので、実在のデータではない。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
new Function(fs.readFileSync(path.join(root, 'js/rbf-math.js'), 'utf8'))();
const M = globalThis.RBFM;

const POINT_COUNT = 200;
const TEST_COUNT = 500;
const REPEATS = 10; // 誤差は乱数の種を変えて平均する
const HIST_DIMS = [2, 3, 5, 10, 20, 50];
const ERROR_DIMS = [2, 3, 4, 5, 7, 10, 15, 20, 30, 50];
const UNIT_SCALES = [1, 3, 10, 30, 100, 300, 1000];
const HIST_BIN = 0.05;
const HIST_MAX = 2.2; // 距離 ÷ 平均距離 の範囲
const SECTION_SAMPLES = 120;
const FIXED_EPS = 1.6; // 第6章の例で使った幅をそのまま使う
const SEED_POINTS = 1000;
const SEED_TEST = 2000;
const SEED_STEP = 37;

const thinPlate = M.BASIS.thinPlate();
const round = (v, digits = 4) => Number(v.toFixed(digits));
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const rmse = (a, b) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length);
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
function pairDistances(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) out.push(M.distance(points[i], points[j]));
  return out;
}

// ---- 点どうしの距離の分布と、データ点から新しい点への断面 ----
function histogramFor(d) {
  const points = M.standardPoints(POINT_COUNT, d, SEED_POINTS + d);
  const tests = M.standardPoints(TEST_COUNT, d, SEED_TEST + d);
  const distances = pairDistances(points);
  const average = mean(distances);
  const sd = Math.sqrt(mean(distances.map((r) => (r - average) ** 2)));
  const bins = new Array(Math.round(HIST_MAX / HIST_BIN)).fill(0);
  distances.forEach((r) => {
    const k = Math.floor(r / average / HIST_BIN);
    if (k < bins.length) bins[k]++;
  });
  const density = bins.map((c) => round(c / distances.length / HIST_BIN, 3));
  const nearest = tests.map((q) => Math.min(...points.map((p) => M.distance(p, q))));

  // 断面: 平面からいちばん外れたデータ点 A から、新しい点 Q（テストの1点目）へまっすぐ進む
  const values = points.map(M.relevantTarget);
  const tps = M.fit(points, values, thinPlate, { degree: 1 });
  const plane = M.fitPlane(points, values);
  const gauss = M.fit(points, values, M.BASIS.gaussian(FIXED_EPS));
  let a = 0;
  points.forEach((p, i) => {
    if (Math.abs(values[i] - plane.at(p)) > Math.abs(values[a] - plane.at(points[a]))) a = i;
  });
  const A = points[a];
  const Q = tests[0];
  const ts = Array.from({ length: SECTION_SAMPLES + 1 }, (_, k) => k / SECTION_SAMPLES);
  const along = (t) => A.map((v, k) => v + t * (Q[k] - v));
  return {
    d,
    meanDistance: round(average, 3),
    relativeSd: round(sd / average, 3),
    nearestRatio: round(mean(nearest) / average, 3),
    density,
    section: {
      distance: round(M.distance(A, Q), 2),
      tps: ts.map((t) => round(tps.at(along(t)), 3)),
      plane: ts.map((t) => round(plane.at(along(t)), 3)),
      gauss: ts.map((t) => round(gauss.at(along(t)), 3)),
      truth: ts.map((t) => round(M.relevantTarget(along(t)), 3)),
    },
  };
}

// ---- 変数の数と誤差（効くのは2変数だけ、残りは関係のない変数）----
function errorsFor(d) {
  const totals = { tps: 0, plane: 0, gaussFixed: 0, gaussScaled: 0, difference: 0 };
  for (let r = 0; r < REPEATS; r++) {
    const points = M.standardPoints(POINT_COUNT, d, SEED_POINTS + d + (r + 1) * SEED_STEP * 100);
    const tests = M.standardPoints(TEST_COUNT, d, SEED_TEST + d + (r + 1) * SEED_STEP * 100);
    const values = points.map(M.relevantTarget);
    const truth = tests.map(M.relevantTarget);
    const tps = M.fit(points, values, thinPlate, { degree: 1 });
    const plane = M.fitPlane(points, values);
    const gaussFixed = M.fit(points, values, M.BASIS.gaussian(FIXED_EPS));
    const gaussScaled = M.fit(points, values, M.BASIS.gaussian(1 / median(pairDistances(points))));
    const predictions = (model) => tests.map((q) => model.at(q));
    const tpsValues = predictions(tps);
    const planeValues = predictions(plane);
    totals.tps += rmse(tpsValues, truth);
    totals.plane += rmse(planeValues, truth);
    totals.gaussFixed += rmse(predictions(gaussFixed), truth);
    totals.gaussScaled += rmse(predictions(gaussScaled), truth);
    totals.difference += rmse(tpsValues, planeValues);
  }
  return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v / REPEATS, 3)]));
}

// ---- 1つの変数の単位だけを変える（3変数すべてが効く関数。x₃ を s 倍して TPS を作る）----
function unitsFor(scale) {
  let total = 0;
  let plane = 0;
  for (let r = 0; r < REPEATS; r++) {
    const points = M.standardPoints(POINT_COUNT, 3, SEED_POINTS + 7 + (r + 1) * SEED_STEP);
    const tests = M.standardPoints(TEST_COUNT, 3, SEED_TEST + 7 + (r + 1) * SEED_STEP);
    const values = points.map(M.threeVariableTarget);
    const truth = tests.map(M.threeVariableTarget);
    const rescale = (p) => [p[0], p[1], p[2] * scale];
    const scaled = points.map(rescale);
    const tps = M.fit(scaled, values, thinPlate, { degree: 1 });
    const flat = M.fitPlane(scaled, values);
    total += rmse(tests.map((q) => tps.at(rescale(q))), truth);
    plane += rmse(tests.map((q) => flat.at(rescale(q))), truth);
  }
  return { scale, tps: round(total / REPEATS, 3), plane: round(plane / REPEATS, 3) };
}

const started = Date.now();
const data = {
  pointCount: POINT_COUNT,
  testCount: TEST_COUNT,
  repeats: REPEATS,
  fixedEps: FIXED_EPS,
  histBin: HIST_BIN,
  histMax: HIST_MAX,
  histograms: HIST_DIMS.map(histogramFor),
  errors: ERROR_DIMS.map((d) => ({ d, ...errorsFor(d) })),
  units: UNIT_SCALES.map(unitsFor),
};
const file = path.join(root, 'js/multi-data.js');
fs.writeFileSync(file, `// 自動生成（node tools/make-data.mjs）。第8章の実験の結果。乱数（種を固定）で作った説明用のデータで計算した\nwindow.MULTI_DATA = ${JSON.stringify(data)};\n`);
console.log(`${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${((Date.now() - started) / 1000).toFixed(1)} 秒)`);
data.histograms.forEach((h) => console.log(`d=${h.d}: 平均距離 ${h.meanDistance}、ばらつき ${h.relativeSd}、最近傍/平均 ${h.nearestRatio}、|AQ| ${h.section.distance}`));
data.errors.forEach((e) => console.log(`d=${e.d}: TPS ${e.tps} 平面 ${e.plane} ガウス固定 ${e.gaussFixed} ガウス幅合わせ ${e.gaussScaled} TPSと平面の差 ${e.difference}`));
data.units.forEach((u) => console.log(`x₃×${u.scale}: TPS ${u.tps} 平面 ${u.plane}`));
