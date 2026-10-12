// 重ね合わせFF補正の8方式：3つの版（標準・グラレコ風・インフォグラフィック風）で共通の中身
// 方式・グループ・出典・ページの文言・発表者ノートはここだけを直す。

const DECK_DATE = '2026年10月3日';
const DECK_NAME = '重ね合わせFF補正の8方式';

// ---- 出典 ----
const REFERENCES = {
  nikonLB: 'Nikon Precision, "Litho Booster Standalone Alignment Station"（全Shotの補正項をFFし、露光機の線形項と合わせる。事例 16点→626点）https://www.nikonprecision.com/products-and-technology/alignment-stations/litho-booster/',
  spieLB: '"Feed-forward alignment correction for advanced overlay process control using a standalone alignment station \'Litho Booster\'," Proc. SPIE 10585, 105852Z (2018). doi:10.1117/12.2297300',
  klaPWG: 'KLA, PWG5 製品資料（反り・両面形状・面内変位・応力の計測）https://www.kla.com/documents/products/brochures/KLA-PWG5-Product-Brochure.pdf',
  spieIPD: '"Wafer-shape based in-plane distortion predictions using superfast 4G metrology," Proc. SPIE 10145 (2017)（形状から面内歪み IPD を予測しFF補正に使う）',
  pwgGroup: '"Patterned wafer geometry grouping for improved overlay control," Semiconductor Digest (2018) https://sst.semiconductor-digest.com/2018/07/patterned-wafer-geometry-grouping-for-improved-overlay-control/',
  klaNZO: 'KLA, WO2018140534A1 "Overlay control with non-zero offset prediction"（NZO＝ADIとAEIの重ね合わせの差）https://patents.google.com/patent/WO2018140534A1/en',
  spieNZO: '"Contribution of optical overlay target design to non-zero offset stability," Proc. SPIE 13426, 134260F (2025). doi:10.1117/12.3060359',
  lamVector: 'Lam Research, VECTOR DT（裏面に応力を打ち消す膜を成膜するPECVD）ニュースリリース 2019-08-07 https://www.globenewswire.com/news-release/2019/08/07/1898426/0/en/Lam-Research-Adds-Global-Wafer-Stress-Management-Solutions-to-Portfolio-for-3D-NAND-Scaling.html',
  nikonLB1000: 'Nikon, "Litho Booster 1000 Enables Highly Accurate Overlay Correction in Wafer-to-Wafer Bonding Processes for 3D Semiconductor Structures"（2026-07-29）https://www.nikon.com/company/news/2026/0729_01/',
};

// ---- グループ（計測の場所で3つ） ----
const GROUPS = {
  A: {
    letter: 'A',
    catch: '露光機だけで完結！',
    name: '露光機単独',
    sub: '露光機のアライメントセンサーで計測から補正まで完結',
    measureTarget: 'アライメントマークの位置（少数〜多点）',
    strength: '追加の装置が不要',
    issue: '点数を増やすほどスループットが下がる',
    methods: [0, 1, 2],
    page: 2,
  },
  B: {
    letter: 'B',
    catch: '先に測って、データを送る！',
    name: 'Litho Booster',
    sub: '露光機外の専用アライメント機（Nikon）で事前に計測',
    measureTarget: 'アライメントマークの位置（全Shot・高密度）',
    strength: '露光機のスループットを落とさず高密度に計測',
    issue: '装置の導入・工程の追加、チャック差の管理',
    note: ['④⑤とも、最終の補正量は', '露光機の線形項＋Litho Boosterの高次・Shot項'],
    methods: [3, 4],
    page: 3,
  },
  C: {
    letter: 'C',
    catch: '形を測って、3通りに使う！',
    name: 'Wafer歪み計測',
    sub: '形状計測機（KLA PWG）でWafer表裏の形状を計測',
    measureTarget: 'Waferの形状（反り・局所的な曲がり）',
    strength: 'マークに頼らず全面の歪みを捉える',
    issue: '形状から歪みへの換算精度',
    methods: [5, 6, 7],
    page: 4,
  },
};

// ---- 方式（ユーザー指定の8方式・この順番） ----
// icon: few=少数点 / many=多点 / manyEst=多点＋推定 / all=全Shot / partEst=一部＋推定 / shape=形状の全面計測 / cvd=裏面成膜 / nzo=形状＋NZO
// flow: [箱の種類, 見出し, 説明, {dashed: 事前の準備}]
// catch: グラレコ風で使う短い言葉
const METHODS = [
  {
    name: '低次補正',
    catch: 'まずはこれ！基本の補正',
    sub: '通常のアライメント計測',
    summary: '少数点の計測で線形成分を補正',
    icon: 'few',
    tag: '低次',
    flow: [
      ['process', '露光機に搬入', 'プリアライメントで向きと中心を合わせる'],
      ['measure', 'アライメント計測', '数〜十数Shotのマーク位置'],
      ['calc', '線形モデルで計算', '最小二乗でパラメータを求める'],
      ['scanner', '低次補正して露光', 'ステージと投影系の調整で補正'],
    ],
    correction: 'Wafer・Shotの線形成分（シフト・倍率・回転・直交度）',
    merit: '追加の装置が不要で、スループットへの影響が最小。全方式の土台',
    caution: 'Wafer外周の反りなど、非線形な歪みは補正できずに残る',
  },
  {
    name: '高次補正',
    sub: '多点アライメント計測',
    catch: '点を増やして細かく',
    summary: '多点の計測で高次成分を補正',
    icon: 'many',
    tag: '高次',
    flow: [
      ['process', '露光機に搬入', '①と同じ'],
      ['measure', '多点アライメント計測', '数十点以上・外周まで広く'],
      ['calc', '高次の多項式で計算', 'Wafer座標の3次以上の項'],
      ['scanner', '高次補正して露光', 'Shotごとの位置・倍率に換算'],
    ],
    correction: 'Waferごとの非線形な歪み（Wafer座標の3次以上の多項式）',
    merit: 'Waferごとに違う非線形な歪みに追従できる',
    caution: '計測時間が増え、スループットが下がる。外周は多項式の外挿に依存',
  },
  {
    name: '推定＋高次補正',
    catch: '測らない所は推定で',
    sub: '多点アライメント＋未測定領域の推定',
    summary: '多点＋未測定領域の推定で補正',
    icon: 'manyEst',
    tag: '高次',
    flow: [
      ['calc', '事前にモデル作成', '過去のアライメント・重ね合わせ実績から', { dashed: true }],
      ['measure', '多点アライメント計測', '②と同じか少ない点数'],
      ['estimate', '未測定領域を推定', '空間補間・過去の歪みの型・機械学習など'],
      ['calc', '全面の歪みから計算', '高次・Shotの補正量へ'],
      ['scanner', '高次補正して露光', '高次補正機能で反映'],
    ],
    correction: '推定で補った全面の歪みから、高次・Shotごとの補正量',
    merit: '計測点を増やさずに、補正を細かくできる',
    caution: '推定が外れると補正が悪化する。重ね合わせ計測で推定精度を監視',
  },
  {
    name: '全Shot補正',
    catch: '全部測って、全部補正',
    sub: 'Litho Boosterで全Shotを計測',
    summary: '全Shotを計測し、Shotごとに補正',
    icon: 'all',
    tag: '全Shot',
    flow: [
      ['measure', '専用機で全Shot計測', '全Shot・Shot内の多点'],
      ['calc', '補正量を計算', '高次（グリッド）＋Shot項'],
      ['scanner', '露光機へ送る（FF）', 'Waferごとの補正量'],
      ['measure', '通常アライメント', '少数点で線形項を計測'],
      ['scanner', '合成して露光', '線形項＋高次・Shot項'],
    ],
    correction: '高次（グリッド）成分と、Shotごとのシフト・倍率・回転',
    merit: '露光機の計測時間を増やさずに高密度計測（メーカー事例：16点→626点）',
    caution: '装置の導入と工程の追加が必要。計測機と露光機のチャック差・待ち時間の影響を管理',
  },
  {
    name: '推定＋全Shot補正',
    catch: '一部測って、残りは推定',
    sub: 'Litho Boosterで一部計測＋推定',
    summary: '一部を計測し、残りは推定して補正',
    icon: 'partEst',
    tag: '全Shot',
    flow: [
      ['calc', '事前にモデル作成', '過去の全Shot計測から', { dashed: true }],
      ['measure', '専用機で一部を計測', '間引いたShotだけを計測'],
      ['estimate', '未測定Shotを推定', 'モデルで全Shotを補う'],
      ['calc', '補正量を計算', '高次・Shotごとの項'],
      ['scanner', '合成して露光', '露光機へ送り、通常アライメントの線形項と合成'],
    ],
    correction: '推定で補った全Shotの補正量（高次＋Shotごと）',
    merit: '専用機1台で処理できる枚数が増え、全Waferに適用しやすい',
    caution: '推定精度の監視が必要。全Shot計測のWaferを定期的に混ぜて推定を検証',
  },
  {
    name: '高次補正',
    sub: 'PWGによるWafer歪み計測',
    catch: '形の変化から歪みを読む',
    summary: '形状変化から面内歪みを求めて補正',
    icon: 'shape',
    tag: '高次',
    flow: [
      ['measure', '工程前にPWG計測', '成膜・エッチ前の形状'],
      ['process', '成膜・エッチなど', '膜の応力で反りが変わる'],
      ['measure', '工程後にPWG計測', '同じWaferの形状'],
      ['calc', '面内歪みを計算', '形状変化→歪み→補正量'],
      ['scanner', '露光機へ送り露光', '高次・Shotごとに補正'],
    ],
    correction: '形状の変化から求めた面内歪み（IPD）を、高次・Shotごとに補正',
    merit: 'アライメントマークに頼らず、全面の細かい歪みを捉えられる',
    caution: '形状から面内歪みへの換算の精度に依存。重ね合わせ計測で換算を確認',
  },
  {
    name: '物理補正',
    catch: '反りそのものを打ち消す',
    sub: '裏面CVDによるWafer歪み補正',
    summary: '裏面の膜で反り・歪み自体を減らす',
    icon: 'cvd',
    tag: '物理',
    flow: [
      ['measure', 'PWGで反りを計測', '反りの大きさと形'],
      ['calc', '裏面膜を設計', '膜の厚さ・応力の分布'],
      ['physical', '裏面にCVDで成膜', '表の膜の応力を打ち消す'],
      ['measure', '形状を再計測', '反りが減ったかを確認'],
      ['scanner', '露光', '残りは露光機で補正'],
    ],
    correction: '裏面膜の応力で、反り・歪みそのものを減らす',
    merit: '露光機の補正範囲やチャック吸着の限界を超える反りに効く',
    caution: '成膜工程とコストが増える。局所的な歪みには膜の分布の制御が必要',
  },
  {
    name: 'NZO補正',
    catch: 'ズレを先回りで予測',
    sub: 'PWGによるWafer歪み計測',
    summary: 'NZOを予測し、目標オフセットに反映',
    icon: 'nzo',
    tag: 'オフセット',
    flow: [
      ['calc', '事前にモデル作成', '形状とNZOの実績から', { dashed: true }],
      ['measure', 'PWGで形状を計測', '露光前のWafer'],
      ['estimate', 'NZOを予測', 'Waferごとに予測'],
      ['scanner', '目標オフセット更新', 'APCの固定値を置き換え'],
      ['scanner', '露光', 'ADIの目標をずらす'],
    ],
    correction: 'WaferごとのNZO（ADIとAEIの差）を、露光の目標オフセットに反映',
    merit: '固定値のNZOでは追えない、Waferごとの差を補正できる',
    caution: '予測モデルをAEI（エッチ後）計測で定期的に検証する',
  },
];

const circled = (index) => String.fromCharCode(0x2460 + index);

// ---- ページごとの見出し・リード文・脚注・左パネルの事実 ----
const PAGES = {
  summary: {
    title: '重ね合わせFF補正の8方式：全体像',
    lead: 'FF（フィードフォワード）補正：露光の前にそのWaferを計測し、結果をその層の露光（⑦は裏面の成膜）に反映する制御。計測の場所で3つに分かれる',
    footer: 'IPD：面内歪み　NZO：現像後に計測マークで測る重ね合わせ（ADI）と、エッチ後のデバイス上の重ね合わせ（AEI）の差',
  },
  A: {
    title: 'A 露光機単独：アライメントセンサーで計測から補正まで',
    lead: '露光機のアライメントセンサーだけで、計測から補正まで完結する。計測点を増やすほど補正は細かくなるが、計測時間が露光機のスループットを直接下げる',
    footer: '計測点数は代表的な目安で、装置・工程・製品で変わる。概念図は傾向を示すもので、実測値ではない',
    facts: [
    ['計測装置', '露光機のアライメントセンサー（露光の直前に、同じチャック上で計測）'],
    ['計測するもの', '前の層で作ったアライメントマークの位置'],
    ['強み', '追加の装置が不要。露光と同じ吸着状態で測れる'],
    ['課題', '計測時間が露光機の稼働時間を直接使う。点数を増やすほどスループットが下がる'],
    ],
  },
  B: {
    title: 'B Litho Booster：専用アライメント機で事前に高密度計測',
    lead: '露光機外の専用機（Nikon Litho Booster）で事前に高密度計測し、補正量を露光機へ送る。露光機のスループットを落とさずに全Shotを補正できる',
    footer: '出典：Nikon Litho Booster 製品説明（補正量の合成、事例 16点→626点）、Proc. SPIE 10585, 105852Z (2018)',
    facts: [
    ['計測装置', 'Nikon Litho Booster（露光機の外に置き、露光機と並行に処理）'],
    ['計測するもの', 'アライメントマークの位置（全Shot・Shot内の多点）'],
    ['強み', '露光機の計測時間を増やさずに、全Shotを高密度に計測'],
    ['課題', '装置の導入と工程の追加。チャック差の管理'],
    ],
    formula: ['最終の補正量 ＝', '露光機の線形項', '＋ Litho Boosterの高次・Shotごとの項'],
    choice: {
      heading: '④と⑤の使い分け',
      lines: [
        '④：Waferごとの歪みの変化が大きく、全Waferを全Shot計測できる処理能力がある場合。',
        '⑤：専用機の処理枚数が足りない場合や、歪みの型が安定していて推定が効く場合。',
      ],
    },
  },
  C: {
    title: 'C Wafer歪み計測：PWGで形状を測り、3通りに使う',
    lead: 'KLA PWGでWafer表裏の形状を全面計測し、工程でできた反り・歪みを捉える。露光機での補正（⑥）、裏面成膜（⑦）、NZOの予測（⑧）に使う',
    footer: '出典：KLA PWG5 製品資料、SPIE 10145 (2017)、Lam Research (2019)、KLA 特許 WO2018140534A1。⑧（形状からNZOを予測）の公開事例は未確認',
    facts: [
    ['計測装置', 'KLA PWG（Wafer表裏の高さを全面で測る形状計測機）'],
    ['計測するもの', 'Waferの形状（反り・局所的な曲がり）と、工程前後の変化'],
    ['強み', 'アライメントマークに頼らず、全面の歪みを高密度に捉える'],
    ['課題', '形状から面内歪みへの換算モデルの精度（膜応力が一様でない場合など）'],
    ],
  },
};

// ---- 発表者ノート ----
function methodNotes(group) {
  return group.methods.map((i) => {
    const m = METHODS[i];
    return `${circled(i)} ${m.name}（${m.sub}）：流れ＝${m.flow.map((s) => s[1]).join(' → ')}。補正＝${m.correction}。利点＝${m.merit}。注意＝${m.caution}`;
  });
}

function notesFor(key) {
  const g = GROUPS[key];
  const notes = {
    summary: () => [
    '【この資料の要点】重ね合わせのFF補正8方式を、計測の場所で3つに分けた。',
    'A 露光機単独（①〜③）：露光機のアライメントセンサーだけで完結。点数を増やすと細かく補正できるが、スループットが下がる。③は推定で点数の増加を抑える。',
    'B Litho Booster（④⑤）：Nikonの専用アライメント機で事前に高密度計測し、補正量を露光機へ送る。⑤は一部の計測と推定で処理枚数を増やす。',
    'C Wafer歪み計測（⑥〜⑧）：KLA PWGでWafer形状を測る。使い方は、露光機での補正（⑥）、裏面成膜で歪みそのものを減らす（⑦）、NZOの予測（⑧）。',
    '',
    '【出典】各スライドの発表者ノートに記載。全体は次のとおり。',
    ...Object.values(REFERENCES).map((ref, k) => `[${k + 1}] ${ref}`),
    ],
    A: () => [
    '【この資料の要点】露光機単独のFF補正は、①少数点で線形成分、②多点で高次成分、③多点の計測に未測定領域の推定を加える、の3段階。',
    '',
    ...methodNotes(g),
    '',
    '【補足】③の推定には、空間補間（近くの計測点からの補間）、過去の歪みの型（主成分など）への当てはめ、機械学習などがある。どれも推定誤差が残るので、重ね合わせ計測との突き合わせで精度を監視する。',
    ],
    B: () => [
    '【この資料の要点】Litho Booster は露光機の外で高密度にアライメント計測し、高次・Shotごとの補正項を露光機へ送る。露光機では通常アライメントで線形項だけを測り、両者を合わせて露光する。',
    '',
    ...methodNotes(g),
    '',
    '【補足】Nikon は後継機 Litho Booster 1000 を2027年1月に発売すると発表しており、貼り合わせ（Wafer-to-Wafer）工程の重ね合わせ補正への適用もうたっている（Nikon ニュースリリース 2026-07-29）。',
    '',
    '【出典】',
    `[1] ${REFERENCES.nikonLB}`,
    `[2] ${REFERENCES.spieLB}`,
    `[3] ${REFERENCES.nikonLB1000}`,
    ],
    C: () => [
    '【この資料の要点】PWGでWafer表裏の形状を全面計測し、工程でできた反り・歪みを捉える。⑥は面内歪みに換算して露光機で補正、⑦は裏面膜で歪みそのものを減らす、⑧はWaferごとのNZOを予測する。',
    '',
    ...methodNotes(g),
    '',
    '【補足】',
    '・NZO は、ADI（現像後・計測マーク）とAEI（エッチ後・デバイス上）の重ね合わせの差。通常は APC で固定値として入れる。⑧はPWGの形状からWaferごとのNZOを予測して入れる方式。形状からNZOを予測する公開事例は、この資料の作成時に確認できていない。',
    '・裏面CVDは、表面の膜の応力でできた反りを、裏面に打ち消す応力の膜を付けて減らす（例：Lam Research VECTOR DT）。',
    '',
    '【出典】',
    `[1] ${REFERENCES.klaPWG}`,
    `[2] ${REFERENCES.spieIPD}`,
    `[3] ${REFERENCES.pwgGroup}`,
    `[4] ${REFERENCES.lamVector}`,
    `[5] ${REFERENCES.klaNZO}`,
    `[6] ${REFERENCES.spieNZO}`,
    ],
  };
  return notes[key]().join('\n');
}

module.exports = { DECK_DATE, DECK_NAME, REFERENCES, GROUPS, METHODS, PAGES, circled, notesFor };
