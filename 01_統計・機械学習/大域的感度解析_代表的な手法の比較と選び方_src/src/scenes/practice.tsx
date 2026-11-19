// 第6章（微分で測る：DGSM）、第7章（手法の選び方）、まとめ
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, makeScale, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {ISHIGAMI, makeRandomPoints, PRECOMPUTED, SIX} from '../lib/data.ts';
import {REFERENCES, VOICE_CREDIT} from '../script.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {useLines} from '../timeline.ts';
import {Chip, INPUT_COLORS, INPUT_NAMES, MiniSquare, mixColor} from './shared.tsx';

const raw = String.raw;
const B = COLOR.blue;
const O = COLOR.orange;
const A = COLOR.aqua;
const H = COLOR.highlight;

// 範囲のあちこちで傾きを測る絵
const SLOPE_POINTS = makeRandomPoints(14, 9);

export const S6T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={175} w={860}>
      <Card accent={A} style={{height: 325}}>
        <Reveal line={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
            <MiniSquare size={130}>
              {SLOPE_POINTS.map(([x, y], k) => {
                const cx = 12 + x * 106;
                const cy = 118 - y * 106;
                const angle = Math.sin(x * 6) * 0.9;
                return (
                  <g key={k}>
                    <line x1={cx - 14 * Math.cos(angle)} x2={cx + 14 * Math.cos(angle)} y1={cy + 14 * Math.sin(angle)} y2={cy - 14 * Math.sin(angle)} stroke={A} strokeWidth={3} />
                    <circle cx={cx} cy={cy} r={3.5} fill={COLOR.text} />
                  </g>
                );
              })}
            </MiniSquare>
            <div>
              <div style={{fontSize: 38, fontWeight: 800}}>DGSM</div>
              <Label style={{marginTop: 6}} color={COLOR.text}>
                偏微分を、範囲全体で平均する
              </Label>
              <Label size={26} style={{marginTop: 4}}>
                Derivative-based Global Sensitivity Measure
              </Label>
            </div>
          </div>
        </Reveal>
        <Reveal line={1}>
          <div style={{marginTop: 10}}>
            <Tex tex={raw`\nu_i = E\!\left[\left(\dfrac{\partial f}{\partial x_i}\right)^{\!2}\,\right]`} size={36} color={H} />
          </div>
        </Reveal>
      </Card>
    </Box>
    <Box x={SIZE.sideMargin} y={520} w={860}>
      <Reveal line={2}>
        <Card accent={B} style={{height: 340}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
            <div style={{fontSize: 34, fontWeight: 800}}>総合効果の上限</div>
            <Label size={26}>Sobol & Kucherenko 2009</Label>
          </div>
          <div style={{marginTop: 22}}>
            <Tex tex={raw`S_{Ti} \le \dfrac{(b_i - a_i)^2\,\nu_i}{\pi^2\,\mathrm{Var}(Y)}`} size={46} />
          </div>
          <Label style={{marginTop: 14}}>Xᵢ が a〜b の一様分布のとき</Label>
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={175} w={850}>
      <Reveal line={3}>
        <Card accent={O} style={{height: 320}}>
          <div style={{fontSize: 36, fontWeight: 800}}>上限が小さい → 総合効果も小さい</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 30}}>
            <Chip color={O} filled size={34}>
              固定してよい
            </Chip>
            <Label color={COLOR.text}>＝ ふるい分けに向く</Label>
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={980} y={520} w={850}>
      <Reveal line={4}>
        <Card accent={H} style={{height: 340}}>
          <div style={{fontSize: 34, fontWeight: 800}}>計算の工夫と、Morris法との関係</div>
          <Label style={{marginTop: 18}} color={COLOR.text}>
            ・微分を自動で求められれば、計算がさらに少ない
          </Label>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 18}}>
            <Label color={COLOR.text}>・Morris法の</Label>
            <Tex tex={raw`\mu^*_i \approx E\left|\dfrac{\partial f}{\partial x_i}\right|`} size={36} />
          </div>
          <Label style={{marginTop: 10}} color={H}>
            → 2つの手法は親戚
          </Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

// ---- 図解：上限と総合効果 ----
const SIX_RECT = {x: 200, y: 300, w: 720, h: 440};
const ISH_RECT = {x: 1170, y: 300, w: 620, h: 440};
const SIX_NAMES = ['X₁', 'X₂', 'X₃', 'X₄', 'X₅', 'X₆'];
const SIX_COLORS = [B, O, A, COLOR.muted, COLOR.muted, COLOR.muted];
const DGSM = PRECOMPUTED.dgsm;

// 塗った棒（総合効果）と、枠だけの棒（DGSM の上限）を並べる
const BoundBars: React.FC<{
  rect: {x: number; y: number; w: number; h: number};
  names: string[];
  colors: string[];
  totals: number[];
  bounds: number[];
  yMax: number;
  grow: number;
  showBound: number;
  digits?: number;
}> = ({rect, names, colors, totals, bounds, yMax, grow, showBound, digits = 2}) => {
  const step = rect.w / names.length;
  const sy = makeScale(0, yMax, rect.y + rect.h, rect.y);
  const barW = Math.min(70, step * 0.5);
  return (
    <g>
      {names.map((name, i) => {
        const cx = rect.x + step * (i + 0.5);
        const totalH = (sy(0) - sy(Math.min(totals[i], yMax))) * grow;
        const boundH = (sy(0) - sy(Math.min(bounds[i], yMax))) * showBound;
        return (
          <g key={name}>
            <rect x={cx - barW / 2} y={sy(0) - totalH} width={barW} height={totalH} rx={4} fill={colors[i]} />
            <rect x={cx - barW / 2 - 8} y={sy(0) - boundH} width={barW + 16} height={boundH} rx={4} fill="none" stroke={COLOR.text} strokeWidth={3} strokeDasharray="8 5" />
            <SvgText x={cx} y={sy(0) - boundH - 22} size={24} color={COLOR.text} weight={700} opacity={showBound}>
              {bounds[i].toFixed(digits)}
            </SvgText>
            <SvgText x={cx} y={rect.y + rect.h + 28} size={28} color={COLOR.text} weight={700}>
              {name}
            </SvgText>
          </g>
        );
      })}
    </g>
  );
};

export const S6V: React.FC = () => {
  const {rise, currentLine} = useLines();
  const ishY = makeScale(0, 8, ISH_RECT.y + ISH_RECT.h, ISH_RECT.y);
  return (
    <>
      <Box x={SIZE.sideMargin} y={168} w={900}>
        <Reveal line={0}>
          <Tex tex={raw`Y = 2X_1 + 1.5X_2 + 3X_1X_3 + 0.3X_4 + 0.1X_5 + 0.1X_6`} size={34} color={COLOR.text} />
          <Label size={26} style={{marginTop: 2}}>
            入力はどれも −1〜1 の一様分布
          </Label>
        </Reveal>
      </Box>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame rect={SIX_RECT} xDomain={[0, 1]} yDomain={[0, 1.2]} yTicks={[0, 0.5, 1]} title="入力が6つの例" format={(v) => String(v)} />
          <BoundBars
            rect={SIX_RECT}
            names={SIX_NAMES}
            colors={SIX_COLORS}
            totals={SIX.totalEffect}
            bounds={DGSM.six.bound}
            yMax={1.2}
            grow={rise(0, 10, 30)}
            showBound={rise(1)}
            digits={currentLine >= 2 ? 3 : 2}
          />
          <g opacity={rise(2)}>
            <rect x={SIX_RECT.x + SIX_RECT.w / 2 + 6} y={SIX_RECT.y + SIX_RECT.h - 120} width={SIX_RECT.w / 2 - 12} height={112} rx={10} fill="none" stroke={H} strokeWidth={4} />
            <SvgText x={SIX_RECT.x + (SIX_RECT.w * 3) / 4} y={SIX_RECT.y + SIX_RECT.h - 150} size={28} color={H} weight={800}>
              上限 ≦ 0.012 → 固定できる
            </SvgText>
          </g>
        </g>
        <g opacity={rise(1)}>
          <rect x={SIX_RECT.x + 330} y={SIX_RECT.y + 20} width={30} height={22} rx={3} fill={B} />
          <SvgText x={SIX_RECT.x + 370} y={SIX_RECT.y + 31} anchor="start" size={24} color={COLOR.text} weight={700}>
            総合効果
          </SvgText>
          <rect x={SIX_RECT.x + 500} y={SIX_RECT.y + 20} width={30} height={22} rx={3} fill="none" stroke={COLOR.text} strokeWidth={3} strokeDasharray="6 4" />
          <SvgText x={SIX_RECT.x + 540} y={SIX_RECT.y + 31} anchor="start" size={24} color={COLOR.text} weight={700}>
            DGSM の上限
          </SvgText>
        </g>
        <g opacity={rise(3)}>
          <PlotFrame rect={ISH_RECT} xDomain={[0, 1]} yDomain={[0, 8]} yTicks={[0, 1, 2, 4, 6, 8]} title="石上関数" format={(v) => String(v)} />
          <line x1={ISH_RECT.x} x2={ISH_RECT.x + ISH_RECT.w} y1={ishY(1)} y2={ishY(1)} stroke={COLOR.warning} strokeWidth={3} strokeDasharray="10 6" />
          <SvgText x={ISH_RECT.x + ISH_RECT.w / 3} y={ishY(1) - 18} size={24} color={COLOR.warning} weight={700}>
            総合効果は1以下
          </SvgText>
          <BoundBars
            rect={ISH_RECT}
            names={INPUT_NAMES}
            colors={INPUT_COLORS}
            totals={ISHIGAMI.totalEffect}
            bounds={DGSM.bound}
            yMax={8}
            grow={rise(3, 4, 20)}
            showBound={rise(3, 14, 24)}
            digits={1}
          />
        </g>
      </Canvas>
      <Box x={1170} y={790} w={660}>
        <Reveal line={4}>
          <Label color={COLOR.warning} size={28}>
            DGSM の順位：X₂ ＞ X₃ ＞ X₁
          </Label>
          <Label color={COLOR.text} size={28}>
            総合効果の順位：X₁ ＞ X₂ ＞ X₃
          </Label>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 第7章：比較の表 ----
const TABLE_ROWS = [
  {method: '回帰・相関', view: '傾き', know: '単調な効果の順位', cost: '数百〜1000', caution: 'R² が小さいと使えない', color: COLOR.subText, line: 1},
  {method: 'Morris法', view: '要素効果', know: 'ふるい分け', cost: 'r(d+1) ≈ 数百', caution: '割合としては読めない', color: H, line: 2},
  {method: 'DGSM', view: '微分', know: 'ふるい分け（上限）', cost: 'N(d+1) ≈ 数千', caution: '激しく曲がると上限がゆるい', color: A, line: 2},
  {method: 'Sobol法', view: '分散', know: '一次効果・総合効果', cost: 'N(d+2) ≈ 1万', caution: '計算回数が多い', color: B, line: 3},
  {method: 'FAST・eFAST', view: '分散（周波数）', know: '一次効果・総合効果', cost: 'N·d ≈ 1万', caution: '周波数の干渉で少しずれる', color: B, line: 3},
  {method: 'PAWN・δ', view: '分布', know: '分布の形の変化', cost: '数千', caution: '割合としては読めない', color: O, line: 4},
];
const COLUMNS = [
  {key: 'method', label: '手法', width: 300},
  {key: 'view', label: '見ているもの', width: 250},
  {key: 'know', label: '分かること', width: 340},
  {key: 'cost', label: '計算回数（d = 10）', width: 330},
  {key: 'caution', label: '注意点', width: 490},
] as const;
const FLOW = [
  {text: '入力が多い', color: COLOR.muted},
  {text: 'Morris法・DGSM でふるい分け', color: H},
  {text: '残りを Sobol法 で詳しく', color: B},
  {text: '分布の形が大事なら PAWN', color: O},
];

export const S7T: React.FC = () => {
  const {rise} = useLines();
  return (
    <>
      <Box x={SIZE.sideMargin} y={168} w={1740} style={{opacity: rise(0)}}>
        <div style={{fontFamily: FONT, color: COLOR.text}}>
          <div style={{display: 'flex', borderBottom: `3px solid ${COLOR.panelLine}`, paddingBottom: 8}}>
            {COLUMNS.map((column) => (
              <div key={column.key} style={{width: column.width, fontSize: 28, fontWeight: 700, color: COLOR.subText}}>
                {column.label}
              </div>
            ))}
          </div>
          {TABLE_ROWS.map((row) => (
            <div
              key={row.method}
              style={{display: 'flex', alignItems: 'center', height: 68, borderBottom: `2px solid ${COLOR.grid}`, opacity: rise(row.line), translate: `${(1 - rise(row.line)) * 20}px 0px`}}
            >
              {COLUMNS.map((column) => (
                <div
                  key={column.key}
                  style={{
                    width: column.width,
                    fontSize: column.key === 'method' ? 34 : 30,
                    fontWeight: column.key === 'method' ? 800 : 600,
                    color: column.key === 'method' ? row.color : column.key === 'caution' ? COLOR.subText : COLOR.text,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row[column.key]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Box>
      <Box x={SIZE.sideMargin} y={670} w={1740}>
        <Reveal line={5}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            {FLOW.map((step, index) => (
              <div key={step.text} style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 14,
                    border: `3px solid ${step.color}`,
                    backgroundColor: COLOR.panel,
                    fontFamily: FONT,
                    fontSize: 29,
                    fontWeight: 800,
                    color: COLOR.text,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.text}
                </div>
                {index < FLOW.length - 1 ? <div style={{fontSize: 40, color: COLOR.subText}}>→</div> : null}
              </div>
            ))}
          </div>
        </Reveal>
      </Box>
      <Box x={SIZE.sideMargin} y={800} w={1740}>
        <Reveal line={6}>
          <Label color={COLOR.text} size={30}>
            入力どうしに相関がある → シャープレイ効果（Owen 2014）など、相関を扱える手法へ
          </Label>
        </Reveal>
      </Box>
    </>
  );
};

// ---- 図解：石上関数での結果を並べる ----
const R = PRECOMPUTED;
const GRID_ROWS = [
  {method: '回帰（SRC）', cost: R.regression.n, values: R.regression.src.map(Math.abs), group: 1, digits: 2},
  {method: '順位相関（PRCC）', cost: R.regression.n, values: R.regression.prcc.map(Math.abs), group: 1, digits: 2},
  {method: 'Morris法 μ*', cost: R.morris.cost, values: R.morris.muStar, group: 3, digits: 1},
  {method: 'Sobol法 一次効果', cost: R.sobol.cost, values: R.sobol.first.map((v) => Math.max(0, v)), group: 2, digits: 2},
  {method: 'Sobol法 総合効果', cost: R.sobol.cost, values: R.sobol.totalEffect, group: 3, digits: 2},
  {method: 'eFAST 一次効果', cost: R.fast.cost, values: R.fast.first, group: 2, digits: 2},
  {method: 'eFAST 総合効果', cost: R.fast.cost, values: R.fast.totalEffect, group: 3, digits: 2},
  {method: 'PAWN', cost: R.pawn.n, values: R.pawn.median, group: 3, digits: 2},
  {method: 'DGSM の上限', cost: R.dgsm.cost, values: R.dgsm.bound, group: 4, digits: 1},
];
const GRID_X = 150;
const METHOD_W = 400;
const COST_W = 170;
const CELL_W = 250;
const ROW_H = 58;
const GRID_Y = 220;
const MARK_X = GRID_X + METHOD_W + COST_W + 3 * CELL_W + 40;

export const S7V: React.FC = () => {
  const {rise, currentLine} = useLines();
  const verdict = (row: (typeof GRID_ROWS)[number]) => (row.group === 4 ? '順位ずれ' : row.group === 3 ? '○' : '✕');
  return (
    <Canvas>
      <g opacity={rise(0)}>
        <SvgText x={GRID_X} y={GRID_Y - 30} anchor="start" size={26} color={COLOR.subText} weight={700}>
          手法（計算回数）
        </SvgText>
        {INPUT_NAMES.map((name, i) => (
          <SvgText key={name} x={GRID_X + METHOD_W + COST_W + CELL_W * (i + 0.5)} y={GRID_Y - 30} size={32} color={INPUT_COLORS[i]} weight={800}>
            {name}
          </SvgText>
        ))}
        <SvgText x={MARK_X + 90} y={GRID_Y - 30} size={26} color={COLOR.subText} weight={700} opacity={rise(1)}>
          X₃ を捉えたか
        </SvgText>
        {GRID_ROWS.map((row, r) => {
          const y = GRID_Y + r * ROW_H;
          const max = Math.max(...row.values);
          const active = currentLine >= 1 && currentLine <= 4 ? (row.group === currentLine ? 1 : currentLine > row.group ? 0.75 : 0.35) : 1;
          return (
            <g key={row.method} opacity={active}>
              <SvgText x={GRID_X} y={y + ROW_H / 2} anchor="start" size={30} color={COLOR.text} weight={700}>
                {row.method}
              </SvgText>
              <SvgText x={GRID_X + METHOD_W + COST_W - 20} y={y + ROW_H / 2} anchor="end" size={24} color={COLOR.muted}>
                {`${row.cost}回`}
              </SvgText>
              {row.values.map((value, i) => {
                const share = value / max;
                return (
                  <g key={i}>
                    <rect
                      x={GRID_X + METHOD_W + COST_W + i * CELL_W + 4}
                      y={y + 4}
                      width={CELL_W - 8}
                      height={ROW_H - 8}
                      rx={6}
                      fill={mixColor(COLOR.panel, INPUT_COLORS[i], share)}
                      stroke={i === 2 && row.group === currentLine ? H : 'none'}
                      strokeWidth={4}
                    />
                    <SvgText x={GRID_X + METHOD_W + COST_W + CELL_W * (i + 0.5)} y={y + ROW_H / 2} size={30} color={COLOR.text} weight={800}>
                      {value.toFixed(row.digits)}
                    </SvgText>
                  </g>
                );
              })}
              <SvgText
                x={MARK_X + 90}
                y={y + ROW_H / 2}
                size={row.group === 4 ? 28 : 36}
                color={row.group === 3 ? A : row.group === 4 ? H : COLOR.warning}
                weight={800}
                opacity={rise(row.group)}
              >
                {verdict(row)}
              </SvgText>
            </g>
          );
        })}
        <SvgText x={GRID_X} y={GRID_Y + GRID_ROWS.length * ROW_H + 30} anchor="start" size={24} color={COLOR.muted}>
          色の濃さ：手法ごとに、いちばん大きい値を1とした割合（SRC・PRCC は絶対値）
        </SvgText>
      </g>
    </Canvas>
  );
};


const SUMMARY = [
  {title: '入力を範囲全体でばらつかせて、出力への効きを調べる', color: COLOR.muted, line: 1},
  {title: '回帰・相関は手軽。ただし単調な効果だけ', color: COLOR.subText, line: 2},
  {title: 'Morris法・DGSM は少ない計算でふるい分け', color: H, line: 2},
  {title: 'Sobol法・FAST は分散の割合、PAWN は分布の形', color: B, line: 3},
  {title: '入力が多ければ、ふるい分け → 分散で詳しく', color: O, line: 4},
];

export const S8A: React.FC = () => (
  <>
    {SUMMARY.map((item, index) => (
      <Box key={item.title} x={SIZE.sideMargin} y={180 + index * 136} w={1150}>
        <Reveal line={item.line} delay={index === 2 ? 12 : 0}>
          <Card accent={item.color} style={{height: 120, display: 'flex', alignItems: 'center', padding: '0 30px'}}>
            <div style={{fontSize: 37, fontWeight: 700, whiteSpace: 'nowrap'}}>{item.title}</div>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1330} y={180} w={500}>
      <Reveal line={5}>
        <Card accent={COLOR.muted} style={{height: 660, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <div style={{fontSize: 46, fontWeight: 800, lineHeight: 1.5, whiteSpace: 'nowrap'}}>
            ご視聴
            <br />
            ありがとう
            <br />
            ございました
          </div>
          <Label style={{marginTop: 40}} size={28}>
            音声：{VOICE_CREDIT}
          </Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

export const S8B: React.FC = () => (
  <Box x={SIZE.sideMargin} y={165} w={1740}>
    <Reveal line={0}>
      <Card accent={COLOR.muted} style={{padding: '16px 28px'}}>
        {REFERENCES.map((reference) => (
          <div key={reference} style={{fontSize: 21, lineHeight: 1.3, color: COLOR.subText, marginTop: 5}}>
            {reference}
          </div>
        ))}
        <div style={{fontSize: 26, color: COLOR.text, marginTop: 14, fontWeight: 600}}>音声：{VOICE_CREDIT}</div>
      </Card>
    </Reveal>
  </Box>
);
