// svd-math.js — 特異値分解の計算（片側ヤコビ法）と、説明用のデータ（白黒の画像、2次元の点群）。
// 乱数は種を固定する。録画で同じ時刻 t に必ず同じ絵を出すため。
// node からも読めるように、window が無ければ globalThis に置く（数値の確認用）。
// 行列は「行の配列」（各行は Float64Array）で持つ。分解の結果の U・V は「列ベクトルの配列」（U[i] が uᵢ）。
(typeof window !== 'undefined' ? window : globalThis).SVDM = (() => {
  // 片側ヤコビ法: 2つの列の内積が、長さの積のこの割合より小さくなったら直交とみなす
  const ORTHOGONAL_TOLERANCE = 1e-13;
  const MAX_SWEEPS = 60;

  // ---- 乱数 ----
  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 標準正規乱数（ボックス＝ミュラー法）
  function standardNormals(count, seed) {
    const rand = createRandom(seed);
    const values = new Float64Array(count);
    for (let i = 0; i < count; i += 2) {
      const radius = Math.sqrt(-2 * Math.log(1 - rand()));
      const angle = 2 * Math.PI * rand();
      values[i] = radius * Math.cos(angle);
      if (i + 1 < count) values[i + 1] = radius * Math.sin(angle);
    }
    return values;
  }

  // ---- 行列の小道具 ----
  const dot = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  };
  const norm = (a) => Math.sqrt(dot(a, a));
  const transpose = (A) => Array.from({ length: A[0].length }, (_, j) => Float64Array.from(A, (row) => row[j]));
  const frobenius = (A) => Math.sqrt(A.reduce((sum, row) => sum + dot(row, row), 0));
  const subtract = (A, B) => A.map((row, i) => Float64Array.from(row, (v, j) => v - B[i][j]));

  // 2本のベクトルを同じ角度だけ回す（x ← c·x − s·y、y ← s·x + c·y）
  function rotatePair(x, y, c, s) {
    for (let k = 0; k < x.length; k++) {
      const a = x[k];
      const b = y[k];
      x[k] = c * a - s * b;
      y[k] = s * a + c * b;
    }
  }

  // 特異値分解（片側ヤコビ法）。A の列どうしが直交するまで、2列ずつ回転させる。
  // 回転を全部掛けたものが V、回し終えた列の長さが特異値、列を長さで割ったものが U になる。
  // 横長（m < n）のときは Aᵀ を分解して、U と V を入れかえる。結果は特異値の大きい順。
  function svd(A) {
    const m = A.length;
    const n = A[0].length;
    if (m < n) {
      const t = svd(transpose(A));
      return { U: t.V, S: t.S, V: t.U };
    }
    const cols = transpose(A);
    const vcols = Array.from({ length: n }, (_, j) => {
      const v = new Float64Array(n);
      v[j] = 1;
      return v;
    });
    for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
      let rotated = false;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          const alpha = dot(cols[p], cols[p]);
          const beta = dot(cols[q], cols[q]);
          const gamma = dot(cols[p], cols[q]);
          if (Math.abs(gamma) <= ORTHOGONAL_TOLERANCE * Math.sqrt(alpha * beta)) continue;
          rotated = true;
          // 回したあとの2列の内積が 0 になる角度（tan の小さい方の解を使う）
          const zeta = (beta - alpha) / (2 * gamma);
          const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
          const c = 1 / Math.sqrt(1 + t * t);
          rotatePair(cols[p], cols[q], c, c * t);
          rotatePair(vcols[p], vcols[q], c, c * t);
        }
      }
      if (!rotated) break;
    }
    const order = cols.map((col, j) => [norm(col), j]).sort((a, b) => b[0] - a[0]);
    return {
      S: Float64Array.from(order, ([s]) => s),
      U: order.map(([s, j]) => Float64Array.from(cols[j], (x) => (s > 0 ? x / s : 0))),
      V: order.map(([, j]) => vcols[j]),
    };
  }

  // ランク1の層 σᵢ uᵢ vᵢᵀ（i は 0 から数える）
  const layer = (res, i) => Array.from(res.U[i], (ui) => Float64Array.from(res.V[i], (vj) => res.S[i] * ui * vj));

  // 大きい方から k 個の層の和 A_k を、ks の各 k について作る（層を1枚ずつ足していく）
  function lowRankSeries(res, ks) {
    const m = res.U[0].length;
    const n = res.V[0].length;
    const sum = Array.from({ length: m }, () => new Float64Array(n));
    const result = {};
    let added = 0;
    for (const k of [...ks].sort((a, b) => a - b)) {
      for (; added < k; added++) {
        const u = res.U[added];
        const v = res.V[added];
        const s = res.S[added];
        for (let i = 0; i < m; i++) {
          const su = s * u[i];
          const row = sum[i];
          for (let j = 0; j < n; j++) row[j] += su * v[j];
        }
      }
      result[k] = sum.map((row) => Float64Array.from(row));
    }
    return result;
  }

  // ランク k 近似の相対誤差 ‖A − A_k‖_F / ‖A‖_F（エッカート・ヤングの定理で、捨てた特異値だけから求まる）
  function relativeError(S, k) {
    let all = 0;
    let dropped = 0;
    S.forEach((s, i) => {
      all += s * s;
      if (i >= k) dropped += s * s;
    });
    return Math.sqrt(dropped / all);
  }

  // ---- 説明用の白黒画像（明るさ 0〜1）。式で描くので、いつ作っても同じ値になる ----
  // 空・太陽・雲・三角の山・丘・道・家・木。縦横にそろった形（家）と斜めの線（山・屋根・道）の両方を入れる
  const IMAGE_ROWS = 120;
  const IMAGE_COLS = 160;
  function makeLandscape(rows = IMAGE_ROWS, cols = IMAGE_COLS) {
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    // 画素（中心が整数の位置、幅 1）が区間 [a, b] と重なる割合
    const overlap = (x, a, b) => clamp01(Math.min(x + 0.5, b) - Math.max(x - 0.5, a));
    const rect = (c, r, c0, c1, r0, r1) => overlap(c, c0, c1) * overlap(r, r0, r1);
    // 符号つき距離 d（外が正）から、ふちをなめらかにした塗りの割合
    const edge = (d) => clamp01(0.5 - d);
    const peaks = [
      { x: 38, y: 34, slope: 0.8 },
      { x: 92, y: 44, slope: 0.62 },
      { x: 150, y: 38, slope: 0.85 },
    ];
    const image = [];
    for (let r = 0; r < rows; r++) {
      const row = new Float64Array(cols);
      for (let c = 0; c < cols; c++) {
        let v = 0.82 - 0.0032 * r; // 空（上ほど明るい）
        const paint = (cover, value) => (v += (value - v) * cover);
        paint(edge(Math.hypot(c - 124, r - 24) - 12), 0.98); // 太陽
        paint(edge(Math.hypot((c - 58) / 17, (r - 17) / 6) * 6 - 6), 0.94); // 雲
        paint(edge(Math.hypot((c - 74) / 12, (r - 21) / 5) * 5 - 5), 0.94);
        const ridge = Math.min(...peaks.map((p) => p.y + p.slope * Math.abs(c - p.x)));
        paint(clamp01(0.5 + r - ridge), 0.46); // 三角の山
        const hill = 82 - 5 * Math.sin(c * 0.045 + 1.1);
        paint(clamp01(0.5 + r - hill), 0.3); // 丘と地面
        // 道: 家の戸口から手前へ広がる台形（斜めのふち）
        if (r > 97) {
          const half = 4 + (r - 97) * 0.55;
          const center = 44 + (r - 97) * 0.9;
          paint(overlap(c, center - half, center + half), 0.62);
        }
        paint(rect(c, r, 26, 62, 70, 98), 0.86); // 家の壁
        paint(clamp01(0.5 + r - (54 + Math.abs(c - 44) * 0.68)) * overlap(r, 40, 70), 0.17); // 屋根（三角）
        paint(rect(c, r, 40, 48, 84, 98), 0.22); // 戸口
        for (const wx of [30, 52]) {
          paint(rect(c, r, wx, wx + 7, 76, 83), 0.3); // 窓
          paint(rect(c, r, wx + 3, wx + 4, 76, 83) + rect(c, r, wx, wx + 7, 79, 80), 0.86); // 窓の桟
        }
        paint(rect(c, r, 103, 107, 78, 100), 0.2); // 木の幹
        paint(edge(Math.hypot(c - 105, r - 70) - 12), 0.16); // 木の葉
        row[c] = clamp01(v);
      }
      image.push(row);
    }
    return image;
  }

  // ---- 主成分分析の例: 2つの変数を持つ点群（斜めに広がる楕円形） ----
  const PCA_COUNT = 150;
  const PCA_MEAN = [3.5, 2.5];
  const PCA_ANGLE_DEG = 32;
  const PCA_SPREAD = [1.5, 0.5]; // 長い向きと短い向きの標準偏差（データを作るときの値）
  function makePcaPoints(seed = 31) {
    const z = standardNormals(PCA_COUNT * 2, seed);
    const a = (PCA_ANGLE_DEG * Math.PI) / 180;
    return Array.from({ length: PCA_COUNT }, (_, i) => {
      const p = PCA_SPREAD[0] * z[2 * i];
      const q = PCA_SPREAD[1] * z[2 * i + 1];
      return [PCA_MEAN[0] + Math.cos(a) * p - Math.sin(a) * q, PCA_MEAN[1] + Math.sin(a) * p + Math.cos(a) * q];
    });
  }

  return {
    createRandom, standardNormals,
    dot, norm, transpose, frobenius, subtract,
    svd, layer, lowRankSeries, relativeError,
    IMAGE_ROWS, IMAGE_COLS, makeLandscape, PCA_COUNT, makePcaPoints,
  };
})();
