// part6.tsx — 第7章（使うときの注意）と、まとめ。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DATA, MU, POST, SMALL } from '../charts';
import { C, Card, linear, Reveal, RevealG, rise, Stage, Tex, track } from '../kit';
import { abs, type SceneProps } from './part1';

// ---------- 7T 使うときの注意 ----------
const CAUTIONS = [
  {
    head: '交換可能性を仮定している',
    body: 'グループを、区別する手がかりのない、入れ替え可能なものとして扱う',
    more: '違いを説明する情報（公立・私立など）があれば、説明変数としてモデルに入れる',
    color: C.blue,
  },
  {
    head: 'グループが少ないと、τ が決まりにくい',
    body: 'τ の事前分布の影響が大きくなる',
    more: 'τ には半正規分布・半コーシー分布がよく使われる（とても平たい逆ガンマ分布は、設定に左右されやすい）',
    color: MU,
  },
  {
    head: '縮約は、推定値を偏らせる',
    body: 'そのかわりに、全体の誤差は小さくなる',
    more: '本当に飛び抜けたグループも、平均へ引き寄せられる',
    color: SMALL,
  },
];

export const Scene7T: React.FC<SceneProps> = ({ cues }) => {
  const times = [
    [cues[1], cues[2]],
    [cues[3], cues[4]],
    [cues[5], cues[5] + 90],
  ];
  return (
    <div style={abs(140, 205, { width: 1640 })}>
      {CAUTIONS.map((item, index) => (
        <Reveal key={item.head} at={times[index][0]} style={{ marginBottom: 16 }}>
          <Card accent={item.color} style={{ display: 'flex', gap: 30, padding: '14px 34px' }}>
            <div style={{ fontSize: 66, fontWeight: 800, color: item.color, width: 56 }}>{index + 1}</div>
            <div>
              <div style={{ fontSize: 42, fontWeight: 700 }}>{item.head}</div>
              <div style={{ fontSize: 31, color: C.text2, marginTop: 6 }}>{item.body}</div>
              <Reveal at={times[index][1]} style={{ fontSize: 28, marginTop: 6, lineHeight: 1.45 }}>
                → {item.more}
              </Reveal>
            </div>
          </Card>
        </Reveal>
      ))}
    </div>
  );
};

// ---------- 7F 計算でつまずきやすい「漏斗」 ----------
const PLOT = { top: 312, height: 500, width: 640, logFrom: 0.6, logTo: 4.1 };
const LEFT_PLOT = { left: 220, from: -35, to: 35, ticks: [-30, -15, 0, 15, 30] };
const RIGHT_PLOT = { left: 1110, from: -3.5, to: 3.5, ticks: [-3, -2, -1, 0, 1, 2, 3] };
const TAU_TICKS = [2, 5, 10, 20, 50];
const ENVELOPE_SD = 2;

const ScatterFrame: React.FC<{ left: number; from: number; to: number; ticks: number[]; xLabel: string; title: string }> = ({ left, from, to, ticks, xLabel, title }) => {
  const sx = linear(from, to, left, left + PLOT.width);
  const sy = linear(PLOT.logFrom, PLOT.logTo, PLOT.top + PLOT.height, PLOT.top);
  return (
    <g>
      <rect x={left} y={PLOT.top} width={PLOT.width} height={PLOT.height} rx={10} fill="#1e1e1c" stroke={C.line} strokeWidth={2} />
      {TAU_TICKS.map((tau) => (
        <g key={tau}>
          <line x1={left} x2={left + PLOT.width} y1={sy(Math.log(tau))} y2={sy(Math.log(tau))} stroke={C.grid} strokeWidth={1.5} />
          <text x={left - 14} y={sy(Math.log(tau)) + 8} fill={C.text2} fontSize={24} textAnchor="end">
            {tau}
          </text>
        </g>
      ))}
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={sx(tick)} x2={sx(tick)} y1={PLOT.top} y2={PLOT.top + PLOT.height} stroke={tick === 0 ? C.axis : C.grid} strokeWidth={tick === 0 ? 2 : 1.5} />
          <text x={sx(tick)} y={PLOT.top + PLOT.height + 32} fill={C.text2} fontSize={24} textAnchor="middle">
            {tick}
          </text>
        </g>
      ))}
      <text x={left - 14} y={PLOT.top - 18} fill={C.text2} fontSize={24} textAnchor="end">
        τ（対数目盛り）
      </text>
      <foreignObject x={left + PLOT.width - 220} y={PLOT.top + PLOT.height + 34} width={220} height={60}>
        <div style={{ textAlign: 'right' }}>
          <Tex tex={xLabel} size={32} color={C.text2} />
        </div>
      </foreignObject>
      <text x={left + PLOT.width / 2} y={PLOT.top - 18} fill={C.text} fontSize={30} fontWeight={700} textAnchor="middle">
        {title}
      </text>
    </g>
  );
};

export const Scene7F: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const leftX = linear(LEFT_PLOT.from, LEFT_PLOT.to, LEFT_PLOT.left, LEFT_PLOT.left + PLOT.width);
  const rightX = linear(RIGHT_PLOT.from, RIGHT_PLOT.to, RIGHT_PLOT.left, RIGHT_PLOT.left + PLOT.width);
  const sy = linear(PLOT.logFrom, PLOT.logTo, PLOT.top + PLOT.height, PLOT.top);
  const shownLeft = Math.round(track(frame, [cues[0] + 20, cues[0] + 90], [0, DATA.funnel.length]));
  const shownRight = rise(frame, cues[4] + 10, 30);
  const envelope = (sign: number) => {
    let d = '';
    for (let i = 0; i <= 80; i++) {
      const logTau = PLOT.logFrom + ((PLOT.logTo - PLOT.logFrom) * i) / 80;
      const offset = Math.max(LEFT_PLOT.from, Math.min(LEFT_PLOT.to, sign * ENVELOPE_SD * Math.exp(logTau)));
      d += `${i === 0 ? 'M' : 'L'}${leftX(offset).toFixed(1)} ${sy(logTau).toFixed(1)}`;
    }
    return d;
  };
  const inside = (x: number, from: number, to: number, logTau: number) => x >= from && x <= to && logTau >= PLOT.logFrom && logTau <= PLOT.logTo;
  return (
    <Stage>
      <RevealG at={cues[0]}>
        <ScatterFrame {...LEFT_PLOT} xLabel="\theta_{\mathrm{C}}-\mu" title="C 校：θ − μ と τ の標本" />
      </RevealG>
      <g>
        {DATA.funnel.slice(0, shownLeft).map((point, index) =>
          inside(point.offset, LEFT_PLOT.from, LEFT_PLOT.to, point.logTau) ? (
            <circle key={index} cx={leftX(point.offset)} cy={sy(point.logTau)} r={3.6} fill={POST} opacity={0.45} />
          ) : null,
        )}
      </g>
      <RevealG at={cues[1]}>
        <path d={envelope(1)} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="10 7" />
        <path d={envelope(-1)} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="10 7" />
        <text x={LEFT_PLOT.left + PLOT.width - 16} y={PLOT.top + 40} fill={C.yellow} fontSize={26} fontWeight={700} textAnchor="end">
          τ が大きい：広く散らばる
        </text>
        <text x={LEFT_PLOT.left + 16} y={PLOT.top + PLOT.height - 16} fill={C.yellow} fontSize={26} fontWeight={700}>
          τ が小さい：μ のそば
        </text>
      </RevealG>
      <RevealG at={cues[2]}>
        <ellipse cx={leftX(0)} cy={sy(1.05)} rx={70} ry={42} fill="none" stroke={SMALL} strokeWidth={4} />
        <text x={leftX(0) + 84} y={sy(1.05) - 6} fill={SMALL} fontSize={26} fontWeight={700}>
          細い首では
        </text>
        <text x={leftX(0) + 84} y={sy(1.05) + 26} fill={SMALL} fontSize={26} fontWeight={700}>
          HMC が動きにくい
        </text>
      </RevealG>
      <RevealG at={cues[3]}>
        <rect x={RIGHT_PLOT.left} y={184} width={PLOT.width} height={74} rx={14} fill={C.panel} stroke={POST} strokeWidth={2} />
        <foreignObject x={RIGHT_PLOT.left} y={184} width={PLOT.width} height={74}>
          <div style={{ width: PLOT.width, height: 74, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <Tex tex="\theta_j=\mu+\tau\,\eta_j,\quad \eta_j\sim\mathcal{N}(0,1)" size={38} />
          </div>
        </foreignObject>
        <text x={(LEFT_PLOT.left + PLOT.width + RIGHT_PLOT.left) / 2} y={PLOT.top + PLOT.height / 2} fill={C.text2} fontSize={60} textAnchor="middle">
          →
        </text>
        <text x={(LEFT_PLOT.left + PLOT.width + RIGHT_PLOT.left) / 2} y={PLOT.top + PLOT.height / 2 + 50} fill={C.text2} fontSize={24} textAnchor="middle">
          非中心化
        </text>
      </RevealG>
      <g opacity={shownRight}>
        <ScatterFrame {...RIGHT_PLOT} xLabel="\eta_{\mathrm{C}}" title="η に直した同じ標本" />
        {DATA.funnel.map((point, index) =>
          inside(point.eta, RIGHT_PLOT.from, RIGHT_PLOT.to, point.logTau) ? (
            <circle key={index} cx={rightX(point.eta)} cy={sy(point.logTau)} r={3.6} fill={C.aqua} opacity={0.45} />
          ) : null,
        )}
        <line x1={rightX(-ENVELOPE_SD)} x2={rightX(-ENVELOPE_SD)} y1={PLOT.top} y2={PLOT.top + PLOT.height} stroke={C.yellow} strokeWidth={3} strokeDasharray="10 7" />
        <line x1={rightX(ENVELOPE_SD)} x2={rightX(ENVELOPE_SD)} y1={PLOT.top} y2={PLOT.top + PLOT.height} stroke={C.yellow} strokeWidth={3} strokeDasharray="10 7" />
      </g>
    </Stage>
  );
};

// ---------- 7C 使いどころと、近い手法 ----------
const USES = ['店舗・地域ごとの売上', '病院ごとの治療成績', '装置・製造ラインごとの品質', '多くの施策を比べる A/B テスト'];
const RELATED = [
  { head: '階層回帰モデル', body: '説明変数を加え、グループごとに切片や傾きが違う' },
  { head: '混合効果モデル', body: '同じ構造（ランダム効果）をもつ' },
  { head: '経験ベイズ', body: 'μ と τ を、分布ではなく1つの値で推定する' },
];
const TOOLS = ['Stan', 'PyMC', 'brms（R）'];

export const Scene7C: React.FC<SceneProps> = ({ cues }) => (
  <div style={abs(130, 205, { width: 1660 })}>
    <Reveal at={cues[0]} style={{ fontSize: 34, color: C.text2 }}>
      グループごとに、データの量が違う場面
    </Reveal>
    <div style={{ display: 'flex', gap: 22, marginTop: 14 }}>
      {USES.map((use, index) => (
        <Reveal key={use} at={cues[1] + index * 12} style={{ flex: 1 }}>
          <Card accent={C.aqua} style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 33, fontWeight: 700, padding: '16px 20px' }}>
            {use}
          </Card>
        </Reveal>
      ))}
    </div>
    <Reveal at={cues[2]} style={{ fontSize: 34, color: C.text2, marginTop: 34 }}>
      近い手法
    </Reveal>
    <div style={{ display: 'flex', gap: 22, marginTop: 14 }}>
      {RELATED.map((item, index) => (
        <Reveal key={item.head} at={cues[2] + index * 30} style={{ flex: 1 }}>
          <Card accent={POST} style={{ height: 170, padding: '18px 26px' }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: POST }}>{item.head}</div>
            <div style={{ fontSize: 30, color: C.text2, marginTop: 8, lineHeight: 1.45 }}>{item.body}</div>
          </Card>
        </Reveal>
      ))}
    </div>
    <Reveal at={cues[3]} style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 22 }}>
      <span style={{ fontSize: 34, color: C.text2 }}>計算の道具</span>
      {TOOLS.map((tool) => (
        <span key={tool} style={{ fontSize: 38, fontWeight: 700, background: C.panel, border: `2px solid ${MU}`, borderRadius: 14, padding: '6px 28px' }}>
          {tool}
        </span>
      ))}
      <span style={{ fontSize: 30, color: C.text2, marginLeft: 10 }}>モデルの式を書けば、MCMC は道具が行う</span>
    </Reveal>
  </div>
);

// ---------- まとめ ----------
const SUMMARY = [
  'グループのパラメータを共通の分布から選ばれたものと考え、その分布もデータから推定する',
  '推定値は重みつき平均。データの少ないグループほど、全体へ引き寄せられる（縮約）',
  '引き寄せる強さは、グループの間のばらつき τ で決まる。計算には MCMC を使う',
  '例題では、別々に推定するより誤差が小さくなった（とくに少人数の学校）',
];
const REFERENCES = [
  'A. Gelman ほか, Bayesian Data Analysis, 3rd ed., CRC Press, 2013（第5章）',
  'A. Gelman, Prior distributions for variance parameters in hierarchical models, Bayesian Analysis 1(3), 2006',
  'B. Efron, C. Morris, Stein’s Paradox in Statistics, Scientific American 236(5), 1977',
  'M. Betancourt, M. Girolami, Hamiltonian Monte Carlo for Hierarchical Models, arXiv:1312.0906, 2013',
  '松浦健太郎『StanとRでベイズ統計モデリング』共立出版, 2016',
];

export const Summary: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const shrink = track(frame, [cues[5], cues[5] + 20], [0, 1]);
  return (
    <div style={abs(140, 186, { width: 1640 })}>
      {SUMMARY.map((text, index) => (
        <Reveal key={index} at={cues[index + 1]} style={{ marginBottom: 14 - 6 * shrink }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: 26, padding: `${18 - 8 * shrink}px 32px` }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: C.yellow }}>{index + 1}</span>
            <span style={{ fontSize: 36 - 2 * shrink, fontWeight: 600 }}>{text}</span>
          </Card>
        </Reveal>
      ))}
      <Reveal at={cues[5]} style={{ marginTop: 10, fontSize: 24, lineHeight: 1.45, color: C.text2 }}>
        <div style={{ color: C.text, fontWeight: 700, fontSize: 28 }}>参考文献</div>
        {REFERENCES.map((reference) => (
          <div key={reference}>・{reference}</div>
        ))}
        <div style={{ marginTop: 8, color: C.text, fontSize: 28 }}>
          <b>読み上げ音声</b>　VOICEVOX:四国めたん　／　図の数値は、説明用に乱数で作ったデータの計算結果です
        </div>
      </Reveal>
    </div>
  );
};
