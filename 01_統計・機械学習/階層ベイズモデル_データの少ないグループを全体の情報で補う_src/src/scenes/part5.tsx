// part5.tsx — 第6章（推定結果を確かめる）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DATA, fmt1, Histogram, highlightColor, LIKE, MU, POST, PRIOR, RAW, rowScales, type RowItem, type RowLayout, schoolByName, SCHOOLS_BY_N, ScoreAxis, ShrinkRows, Star, TRUE } from '../charts';
import { C, Card, linear, Reveal, RevealG, rise, Stage, Tex, track } from '../kit';
import { abs, type SceneProps, texColor } from './part1';

const ROW_ITEMS: RowItem[] = SCHOOLS_BY_N.map((school) => ({
  name: school.name,
  n: school.n,
  raw: school.mean,
  post: school.post.mean,
  truth: school.theta,
  lo: school.post.lo,
  hi: school.post.hi,
}));
const rowIndex = (name: string) => ROW_ITEMS.findIndex((item) => item.name === name);

const Legend: React.FC<{ x: number; y: number; withTruth?: boolean }> = ({ x, y, withTruth = false }) => (
  <g>
    <circle cx={x} cy={y} r={10} fill={C.bg} stroke={RAW} strokeWidth={3.5} />
    <text x={x + 20} y={y + 9} fill={C.text2} fontSize={26}>
      学校の平均点
    </text>
    <circle cx={x + 230} cy={y} r={10} fill={POST} />
    <text x={x + 250} y={y + 9} fill={C.text2} fontSize={26}>
      階層ベイズの推定値
    </text>
    {withTruth ? (
      <>
        <Star x={x + 520} y={y} r={14} />
        <text x={x + 542} y={y + 9} fill={C.text2} fontSize={26}>
          本当の実力
        </text>
      </>
    ) : null}
  </g>
);

// ---------- 6V 推定値は、全体の平均へ引き寄せられる ----------
const LAYOUT_6V: RowLayout = { left: 400, right: 1320, top: 252, rowHeight: 70, from: 45, to: 77, labelX: 350 };
const SCORE_TICKS_6 = [45, 50, 55, 60, 65, 70, 75];
const PROB = { left: 1480, width: 300 };

export const Scene6V: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { sx, rowY } = rowScales(LAYOUT_6V);
  const move = track(frame, [cues[0] + 60, cues[0] + 130], [0, 1]);
  const axisY = LAYOUT_6V.top + LAYOUT_6V.rowHeight * ROW_ITEMS.length + 8;
  const valueLabel = (name: string, at: number) => {
    const item = ROW_ITEMS[rowIndex(name)];
    return (
      <RevealG key={name} at={at}>
        <text
          x={(sx(item.raw) + sx(item.post)) / 2}
          y={rowY(rowIndex(name)) - 20}
          fill={highlightColor(name)}
          fontSize={27}
          fontWeight={700}
          textAnchor="middle"
          stroke={C.bg}
          strokeWidth={6}
          paintOrder="stroke"
        >
          {fmt1(item.raw)} → {fmt1(item.post)}
        </text>
      </RevealG>
    );
  };
  return (
    <Stage>
      <RevealG at={cues[0]}>
        <Legend x={LAYOUT_6V.left} y={222} />
        <ScoreAxis sx={sx} y={axisY} from={LAYOUT_6V.from} to={LAYOUT_6V.to} ticks={SCORE_TICKS_6} />
      </RevealG>
      <RevealG at={cues[1]}>
        <line x1={sx(DATA.post.mu.mean)} x2={sx(DATA.post.mu.mean)} y1={LAYOUT_6V.top - 4} y2={axisY} stroke={MU} strokeWidth={3} strokeDasharray="10 8" />
        <text x={sx(DATA.post.mu.mean)} y={axisY + 66} fill={MU} fontSize={28} fontWeight={700} textAnchor="middle">
          μ {fmt1(DATA.post.mu.mean)}
        </text>
      </RevealG>
      <ShrinkRows layout={LAYOUT_6V} items={ROW_ITEMS} move={move} arrow={rise(frame, cues[0] + 120, 16)} rowsShown={rise(frame, cues[0] + 10, 20)} />
      {valueLabel('C', cues[2] + 10)}
      {valueLabel('G', cues[2] + 80)}
      {valueLabel('E', cues[3] + 10)}
      <RevealG at={cues[4]}>
        <text x={PROB.left} y={222 + 9} fill={C.text} fontSize={28} fontWeight={700}>
          8校で1位である確率
        </text>
        {ROW_ITEMS.map((item, index) => {
          const school = schoolByName(item.name);
          const width = PROB.width * school.top * rise(frame, cues[4] + 10 + index * 3, 20);
          return (
            <g key={item.name}>
              <rect x={PROB.left} y={rowY(index) - 14} width={PROB.width} height={28} rx={6} fill={C.panel} />
              <rect x={PROB.left} y={rowY(index) - 14} width={width} height={28} rx={6} fill={highlightColor(item.name, C.text2)} />
              <text x={PROB.left + PROB.width + 12} y={rowY(index) + 9} fill={C.text} fontSize={26} fontWeight={school.top > 0.2 ? 700 : 400}>
                {Math.round(school.top * 100)}%
              </text>
            </g>
          );
        })}
      </RevealG>
    </Stage>
  );
};

// ---------- 6W ほかの学校から、情報を借りる ----------
const INTERVAL = { left: 560, right: 1500, from: 35, to: 90 };
const INTERVAL_TICKS = [40, 50, 60, 70, 80, 90];
const BORROW = DATA.post.sigma.median ** 2 / DATA.post.tau.median ** 2;

export const Scene6W: React.FC<SceneProps> = ({ cues }) => {
  const sx = linear(INTERVAL.from, INTERVAL.to, INTERVAL.left, INTERVAL.right);
  const c = schoolByName('C');
  const e = schoolByName('E');
  const rows = [
    { label: 'C 校　別々', lo: c.sepLo, hi: c.sepHi, center: c.mean, color: LIKE, y: 640, at: cues[3] },
    { label: 'C 校　階層ベイズ', lo: c.post.lo, hi: c.post.hi, center: c.post.mean, color: POST, y: 690, at: cues[3] + 30 },
    { label: 'E 校　別々', lo: e.sepLo, hi: e.sepHi, center: e.mean, color: LIKE, y: 780, at: cues[5] },
    { label: 'E 校　階層ベイズ', lo: e.post.lo, hi: e.post.hi, center: e.post.mean, color: POST, y: 830, at: cues[5] + 30 },
  ];
  return (
    <>
      <div style={abs(120, 200, { width: 1680 })}>
        <Reveal at={cues[1]} style={{ display: 'flex', alignItems: 'center', gap: 50 }}>
          <Tex
            tex={`\\dfrac{1}{\\operatorname{Var}(\\theta_j)}=${texColor(LIKE, '\\underbrace{\\dfrac{n_j}{\\sigma^2}}_{\\text{データ}}')}+${texColor(PRIOR, '\\underbrace{\\dfrac{1}{\\tau^2}}_{\\text{学校の分布}}')}`}
            size={50}
          />
          <div style={{ fontSize: 30, color: C.text2, lineHeight: 1.5 }}>
            μ と τ を固定したときの、
            <br />
            事後分布の精度（分散の逆数）
          </div>
        </Reveal>
        <Reveal at={cues[2]} style={{ marginTop: 18 }}>
          <Card accent={MU} style={{ display: 'flex', alignItems: 'center', gap: 40, padding: '14px 30px' }}>
            <Tex tex={`\\dfrac{1}{\\tau^2}=\\dfrac{\\sigma^2/\\tau^2}{\\sigma^2}\\approx\\dfrac{${BORROW.toFixed(1)}}{\\sigma^2}`} size={44} />
            <div style={{ fontSize: 32 }}>
              ＝ 約 <b style={{ color: MU, fontSize: 40 }}>{BORROW.toFixed(1)}人分</b> のデータと同じ重み
            </div>
          </Card>
        </Reveal>
      </div>
      <Stage>
        <RevealG at={cues[3]}>
          <text x={INTERVAL.left} y={600} fill={C.text} fontSize={28} fontWeight={700}>
            95% 区間
          </text>
        </RevealG>
        {rows.map((row) => (
          <RevealG key={row.label} at={row.at}>
            <text x={INTERVAL.left - 24} y={row.y + 10} fill={row.color} fontSize={28} fontWeight={700} textAnchor="end">
              {row.label}
            </text>
            <line x1={sx(row.lo)} x2={sx(row.hi)} y1={row.y} y2={row.y} stroke={row.color} strokeWidth={10} strokeLinecap="round" />
            <circle cx={sx(row.center)} cy={row.y} r={9} fill={C.bg} stroke={row.color} strokeWidth={3} />
            <text x={sx(row.hi) + 20} y={row.y + 10} fill={C.text} fontSize={28}>
              幅 <tspan fontWeight={700}>{(row.hi - row.lo).toFixed(1)}</tspan>
            </text>
          </RevealG>
        ))}
        <RevealG at={cues[3]}>
          {INTERVAL_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={sx(tick)} x2={sx(tick)} y1={615} y2={856} stroke={C.grid} strokeWidth={1.5} />
              <text x={sx(tick)} y={884} fill={C.muted} fontSize={22} textAnchor="middle">
                {tick}
              </text>
            </g>
          ))}
        </RevealG>
        <RevealG at={cues[4]}>
          <text x={1830} y={600} fill={C.text2} fontSize={25} textAnchor="end">
            μ と τ の不確かさも含む
          </text>
        </RevealG>
      </Stage>
    </>
  );
};

// ---------- 6R 本当の値と比べる ----------
const LAYOUT_6R: RowLayout = { left: 330, right: 1060, top: 252, rowHeight: 70, from: 45, to: 77, labelX: 290 };
const SCORE_TICKS_6R = [45, 55, 65, 75];
const BAR = { left: 1190, top: 300, baseline: 540, barWidth: 66, gap: 16, groupGap: 64, maxValue: 7 };
const METHODS = [
  { key: 'separate', label: '別々', color: LIKE },
  { key: 'pooled', label: 'まとめ', color: C.orange },
  { key: 'hierarchical', label: '階層', color: POST },
] as const;
const DUMBBELL = { left: 1300, right: 1760, top: 652, rowHeight: 27, max: 10 };

export const Scene6R: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { sx, rowY } = rowScales(LAYOUT_6R);
  const axisY = LAYOUT_6R.top + LAYOUT_6R.rowHeight * ROW_ITEMS.length + 8;
  const bIndex = rowIndex('B');
  const groups = [
    { title: 'この1回', values: DATA.rmse, at: cues[3] },
    { title: `${DATA.repeat.count}回の平均`, values: DATA.repeat, at: cues[4] },
  ];
  const groupWidth = METHODS.length * BAR.barWidth + (METHODS.length - 1) * BAR.gap;
  const barHeight = (value: number) => ((BAR.baseline - BAR.top) * value) / BAR.maxValue;
  const dx = linear(0, DUMBBELL.max, DUMBBELL.left, DUMBBELL.right);
  return (
    <Stage>
      <Legend x={LAYOUT_6R.left - 40} y={222} withTruth />
      <ScoreAxis sx={sx} y={axisY} from={LAYOUT_6R.from} to={LAYOUT_6R.to} ticks={SCORE_TICKS_6R} />
      <ShrinkRows
        layout={LAYOUT_6R}
        items={ROW_ITEMS}
        move={1}
        arrow={1}
        truth={rise(frame, cues[0] + 30, 20)}
        focus={frame < cues[2] ? ['C', 'G'] : ['B']}
        focusAmount={rise(frame, cues[1], 16) * (1 - rise(frame, cues[3], 16))}
        labelSize={28}
      />
      <RevealG at={cues[2] + 10} out={cues[3]}>
        <text x={sx(schoolByName('B').theta)} y={rowY(bIndex) - 24} fill={TRUE} fontSize={28} fontWeight={700} textAnchor="middle" stroke={C.bg} strokeWidth={6} paintOrder="stroke">
          本当の1位 {fmt1(schoolByName('B').theta)}
        </text>
      </RevealG>
      {groups.map((group, g) => {
        const left = BAR.left + g * (groupWidth + BAR.groupGap);
        return (
          <RevealG key={group.title} at={group.at}>
            <text x={left + groupWidth / 2} y={BAR.top - 40} fill={C.text} fontSize={28} fontWeight={700} textAnchor="middle">
              {group.title}
            </text>
            {METHODS.map((method, m) => {
              const value = group.values[method.key];
              const h = barHeight(value) * rise(frame, group.at + 6 + m * 5, 20);
              const x = left + m * (BAR.barWidth + BAR.gap);
              return (
                <g key={method.key}>
                  <rect x={x} y={BAR.baseline - h} width={BAR.barWidth} height={h} rx={6} fill={method.color} />
                  <text x={x + BAR.barWidth / 2} y={BAR.baseline - h - 10} fill={C.text} fontSize={26} fontWeight={700} textAnchor="middle">
                    {value.toFixed(1)}
                  </text>
                  <text x={x + BAR.barWidth / 2} y={BAR.baseline + 32} fill={method.color} fontSize={22} fontWeight={700} textAnchor="middle">
                    {method.label}
                  </text>
                </g>
              );
            })}
            <line x1={left - 8} x2={left + groupWidth + 8} y1={BAR.baseline} y2={BAR.baseline} stroke={C.axis} strokeWidth={2} />
          </RevealG>
        );
      })}
      <RevealG at={cues[3]}>
        <text x={BAR.left - 30} y={BAR.top - 82} fill={C.text2} fontSize={26}>
          誤差の大きさ RMSE（点）
        </text>
      </RevealG>
      <RevealG at={cues[5]}>
        <text x={DUMBBELL.left - 110} y={DUMBBELL.top - 32} fill={C.text2} fontSize={25}>
          学校ごとの RMSE（{DATA.repeat.count}回）　<tspan fill={LIKE}>○ 別々</tspan>　<tspan fill={POST}>● 階層</tspan>
        </text>
        {SCHOOLS_BY_N.map((school, index) => {
          const stats = DATA.repeat.perSchool.find((s) => s.name === school.name)!;
          const y = DUMBBELL.top + index * DUMBBELL.rowHeight;
          return (
            <g key={school.name}>
              <text x={DUMBBELL.left - 16} y={y + 8} fill={highlightColor(school.name, C.text2)} fontSize={22} fontWeight={700} textAnchor="end">
                {school.name}（{school.n}人）
              </text>
              <line x1={dx(stats.hierarchical)} x2={dx(stats.separate)} y1={y} y2={y} stroke={C.line} strokeWidth={4} />
              <circle cx={dx(stats.separate)} cy={y} r={8} fill={C.bg} stroke={LIKE} strokeWidth={3} />
              <circle cx={dx(stats.hierarchical)} cy={y} r={8} fill={POST} />
            </g>
          );
        })}
        {[0, 5, 10].map((tick) => (
          <text key={tick} x={dx(tick)} y={DUMBBELL.top + DUMBBELL.rowHeight * 8 + 6} fill={C.muted} fontSize={20} textAnchor="middle">
            {tick}
          </text>
        ))}
      </RevealG>
    </Stage>
  );
};

// ---------- 6D まとめ具合は、データが決める ----------
const PANELS = [
  { key: 'similar', title: '違いが小さい', left: 110, right: 900, color: C.orange },
  { key: 'different', title: '違いが大きい', left: 1020, right: 1810, color: C.blue },
] as const;
const SCEN = { top: 268, rowHeight: 34, from: 45, to: 90, histBase: 762, histHeight: 120, tauMax: 30 };
const SCEN_TICKS = [50, 60, 70, 80, 90];

export const Scene6D: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const maxDensity = Math.max(...DATA.scenarios.flatMap((scenario) => scenario.tauHist.density));
  return (
    <>
      <Stage>
        {PANELS.map((panel, p) => {
          const scenario = DATA.scenarios.find((s) => s.key === panel.key)!;
          const at = cues[p + 1];
          const layout: RowLayout = { left: panel.left + 150, right: panel.right - 10, top: SCEN.top, rowHeight: SCEN.rowHeight, from: SCEN.from, to: SCEN.to, labelX: panel.left + 130 };
          const items: RowItem[] = [...scenario.schools].sort((a, b) => a.n - b.n).map((s) => ({ name: s.name, n: s.n, raw: s.mean, post: s.post }));
          const { sx } = rowScales(layout);
          const axisY = SCEN.top + SCEN.rowHeight * items.length + 6;
          const tx = linear(0, SCEN.tauMax, layout.left, layout.right);
          const move = track(frame, [at + 40, at + 100], [0, 1]);
          return (
            <g key={panel.key}>
              <RevealG at={cues[0] + p * 10}>
                <rect x={panel.left} y={196} width={panel.right - panel.left} height={44} rx={10} fill={panel.color} opacity={0.18} />
                <text x={(panel.left + panel.right) / 2} y={228} fill={panel.color} fontSize={30} fontWeight={700} textAnchor="middle">
                  {panel.title}（本当の τ ＝ {scenario.trueTau}）
                </text>
              </RevealG>
              <g opacity={rise(frame, at, 16)}>
                <line x1={sx(scenario.mu.mean)} x2={sx(scenario.mu.mean)} y1={SCEN.top} y2={axisY} stroke={MU} strokeWidth={2.5} strokeDasharray="8 6" />
                <ShrinkRows layout={layout} items={items} move={move} arrow={rise(frame, at + 90, 14)} labelSize={22} dotRadius={8} />
                <ScoreAxis sx={sx} y={axisY} from={SCEN.from} to={SCEN.to} ticks={SCEN_TICKS} />
                <Histogram hist={scenario.tauHist} sx={tx} baseline={SCEN.histBase} height={SCEN.histHeight} maxDensity={maxDensity} color={C.violet} grow={rise(frame, at + 60, 30)} />
                <line x1={layout.left} x2={layout.right} y1={SCEN.histBase} y2={SCEN.histBase} stroke={C.axis} strokeWidth={2} />
                {[0, 10, 20, 30].map((tick) => (
                  <text key={tick} x={tx(tick)} y={SCEN.histBase + 30} fill={C.muted} fontSize={22} textAnchor="middle">
                    {tick}
                  </text>
                ))}
                <text x={panel.left + 130} y={SCEN.histBase - 40} fill={C.violet} fontSize={24} fontWeight={700} textAnchor="end">
                  τ の
                </text>
                <text x={panel.left + 130} y={SCEN.histBase - 10} fill={C.violet} fontSize={24} fontWeight={700} textAnchor="end">
                  事後分布
                </text>
                <g opacity={rise(frame, at + 90, 16)}>
                  <line x1={tx(scenario.tau.median)} x2={tx(scenario.tau.median)} y1={SCEN.histBase} y2={SCEN.histBase - SCEN.histHeight - 8} stroke={C.text} strokeWidth={2.5} />
                  <text x={tx(scenario.tau.median) + 10} y={SCEN.histBase - SCEN.histHeight + 6} fill={C.text} fontSize={24} fontWeight={700}>
                    中央値 {fmt1(scenario.tau.median)}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      </Stage>
      <Reveal at={cues[3]} style={abs(360, 812, { width: 1200 })}>
        <Card accent={POST} style={{ padding: '10px 28px', fontSize: 32, textAlign: 'center' }}>
          どこまでまとめるかは、<b style={{ color: POST }}>データの中のばらつき</b>から自動で決まる
        </Card>
      </Reveal>
    </>
  );
};

