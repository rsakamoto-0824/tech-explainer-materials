// 第8章（弱点：すその依存性）と、使いどころ・まとめ
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Canvas, Dots, makeScale, PlotFrame, SvgText, type Rect} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {T_TAIL_LIMIT, TAIL_CURVE, TAIL_GAUSS, TAIL_T, TOP_COUNT_GAUSS, TOP_COUNT_T, TOP_Q} from '../lib/data.ts';
import {COLOR, SIZE} from '../theme.ts';
import {mix, useLines} from '../timeline.ts';
import {format1, toPixels, UNIT_DOMAIN, UNIT_TICKS} from './shared.tsx';

export const S8T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={185} w={1010}>
      <Reveal line={1}>
        <Card accent={COLOR.orange} style={{height: 300}}>
          <div style={{fontSize: 44, fontWeight: 800}}>すその依存性</div>
          <Label>片方が極端に大きいとき、もう片方も極端に大きい確率</Label>
          <div style={{marginTop: 18}}>
            <Tex tex="\lambda_U=\lim\limits_{q\to 1}P(U_2>q\mid U_1>q)" size={48} />
          </div>
        </Card>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={510} w={1010}>
      <Reveal line={2}>
        <Card accent={COLOR.warning} style={{height: 350}}>
          <div style={{fontSize: 44, fontWeight: 800}}>ガウシアンコピュラでは</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 40, marginTop: 16}}>
            <Tex tex="\lambda_U=0" size={64} />
            <Label>相関係数が 1 より小さいかぎり</Label>
          </div>
          <Reveal line={3}>
            <Label color={COLOR.warning} style={{marginTop: 24}} size={38}>
              極端な出来事ほど、ばらばらに起こると見なす
            </Label>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
    <Box x={1140} y={185} w={690}>
      <Reveal line={4}>
        <Card accent={COLOR.muted} style={{height: 430}}>
          <div style={{fontSize: 44, fontWeight: 800}}>2008年の金融危機</div>
          <Label color={COLOR.text} style={{marginTop: 12}}>
            住宅ローンの焦げつきが、
            <br />
            いっせいに発生
          </Label>
          <Reveal line={5}>
            <Label style={{marginTop: 26}}>
              ガウシアンコピュラにもとづくモデルは
              <br />
              同時発生のリスクを小さく
              <br />
              見積もっていた、と批判された
            </Label>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
    <Box x={1140} y={640} w={690}>
      <Reveal line={6}>
        <Card accent={COLOR.aqua} style={{height: 220}}>
          <div style={{fontSize: 40, fontWeight: 800}}>すそが大事な場面では</div>
          <div style={{fontSize: 44, fontWeight: 800, color: COLOR.aqua, marginTop: 14}}>t コピュラなど別のコピュラ</div>
        </Card>
      </Reveal>
    </Box>
  </>
);

const TAIL_PANELS: Rect[] = [
  {x: 130, y: 300, w: 400, h: 400},
  {x: 680, y: 300, w: 400, h: 400},
];
const CHART: Rect = {x: 1320, y: 300, w: 480, h: 400};
const CHART_K_MIN = 0.75;
const FULL_GAUSS = toPixels(TAIL_PANELS[0], UNIT_DOMAIN, UNIT_DOMAIN, TAIL_GAUSS.map((p) => p[0]), TAIL_GAUSS.map((p) => p[1]));
const FULL_T = toPixels(TAIL_PANELS[1], UNIT_DOMAIN, UNIT_DOMAIN, TAIL_T.map((p) => p[0]), TAIL_T.map((p) => p[1]));
const ZOOM_LOW = 0.9;
const ZOOM_TICKS = [0.9, 0.95, 1];
const CHART_Y_MAX = 0.6;
const CHART_TICK_LABELS: Record<number, string> = {1: '10%', 2: '1%', 3: '0.1%', 4: '0.01%'};

// 拡大中は、枠に入る点だけを描く
const zoomedPoints = (points: [number, number][], rect: Rect, low: number) => {
  const visible = points.filter(([a, b]) => a >= low && b >= low);
  return toPixels(rect, [low, 1], [low, 1], visible.map((p) => p[0]), visible.map((p) => p[1]));
};

export const S8V: React.FC = () => {
  const {rise, sweep} = useLines();
  const zoom = sweep(1, 0.15, 0.7);
  const low = mix(0, ZOOM_LOW, zoom);
  const domain: [number, number] = [low, 1];
  const ticks = zoom > 0.98 ? ZOOM_TICKS : zoom < 0.02 ? UNIT_TICKS : [];
  const radius = mix(2.2, 5, zoom);
  const sx = makeScale(CHART_K_MIN, 4, CHART.x, CHART.x + CHART.w);
  const sy = makeScale(0, CHART_Y_MAX, CHART.y + CHART.h, CHART.y);
  const draw = sweep(3, 0.1, 0.6);
  const shown = TAIL_CURVE.slice(0, Math.max(2, Math.round(draw * TAIL_CURVE.length)));
  const path = (key: 'gauss' | 't') => shown.map((point, i) => `${i === 0 ? 'M' : 'L'}${sx(point.k).toFixed(1)} ${sy(point[key]).toFixed(1)}`).join(' ');
  const last = shown[shown.length - 1];
  const counts = [TOP_COUNT_GAUSS, TOP_COUNT_T];
  return (
    <Canvas>
      {TAIL_PANELS.map((rect, index) => {
        const source = index === 0 ? TAIL_GAUSS : TAIL_T;
        const full = index === 0 ? FULL_GAUSS : FULL_T;
        const color = index === 0 ? COLOR.blue : COLOR.orange;
        const corner = toPixels(rect, domain, domain, [TOP_Q], [TOP_Q])[0];
        return (
          <g key={index} opacity={rise(0)}>
            <PlotFrame rect={rect} xDomain={domain} yDomain={domain} xTicks={ticks} yTicks={ticks} title={index === 0 ? 'ガウシアンコピュラ' : 't コピュラ（自由度3）'} format={(v) => (v === 0.95 ? '0.95' : format1(v))} />
            {zoom === 0 ? <Dots points={full} r={2.2} color={color} opacity={0.6} /> : <Dots points={zoomedPoints(source, rect, low)} r={radius} color={color} opacity={0.75} />}
            <g opacity={rise(2)}>
              <rect x={corner[0]} y={rect.y} width={rect.x + rect.w - corner[0]} height={corner[1] - rect.y} fill="none" stroke={COLOR.highlight} strokeWidth={4} />
              <SvgText x={rect.x + 258} y={rect.y + rect.h + 100} size={SIZE.small} color={COLOR.text} weight={700} anchor="end">
                両方が上位1%の点
              </SvgText>
              <SvgText x={rect.x + 276} y={rect.y + rect.h + 98} size={64} color={COLOR.highlight} weight={800} anchor="start">
                {`${counts[index]}個`}
              </SvgText>
            </g>
          </g>
        );
      })}
      <SvgText x={(TAIL_PANELS[0].x + TAIL_PANELS[1].x + TAIL_PANELS[1].w) / 2} y={196} size={SIZE.small} opacity={rise(0)}>
        どちらも相関係数 0.7・点は 5000 個
      </SvgText>
      <g opacity={rise(3)}>
        <PlotFrame rect={CHART} xDomain={[CHART_K_MIN, 4]} yDomain={[0, CHART_Y_MAX]} xTicks={[1, 2, 3, 4]} yTicks={[0, 0.2, 0.4, 0.6]} title="もう片方も上位に入る確率" xLabel="上位どこまでを見るか（右ほど極端）" format={(v) => CHART_TICK_LABELS[v] ?? format1(v)} />
        <path d={path('gauss')} fill="none" stroke={COLOR.blue} strokeWidth={5} strokeLinejoin="round" />
        <path d={path('t')} fill="none" stroke={COLOR.orange} strokeWidth={5} strokeLinejoin="round" />
        <SvgText x={sx(2.3)} y={sy(0.3)} size={SIZE.tick + 2} color={COLOR.text} weight={700} anchor="start" opacity={draw > 0.6 ? 1 : 0}>
          ガウシアンコピュラ
        </SvgText>
        <SvgText x={sx(last.k) - 10} y={sy(last.t) - 30} size={SIZE.tick + 2} color={COLOR.text} weight={700} anchor="end" opacity={draw > 0.6 ? 1 : 0}>
          t コピュラ
        </SvgText>
      </g>
      <g opacity={rise(4)}>
        <line x1={CHART.x} x2={CHART.x + CHART.w} y1={sy(T_TAIL_LIMIT)} y2={sy(T_TAIL_LIMIT)} stroke={COLOR.highlight} strokeWidth={3} strokeDasharray="10 8" />
        <SvgText x={CHART.x + CHART.w - 12} y={sy(T_TAIL_LIMIT) + 28} size={SIZE.tick + 2} color={COLOR.highlight} weight={700} anchor="end">
          {`${T_TAIL_LIMIT.toFixed(2)} でとどまる`}
        </SvgText>
        <SvgText x={CHART.x + CHART.w - 12} y={sy(0.03)} size={SIZE.tick + 2} color={COLOR.highlight} weight={700} anchor="end">
          0 へ向かう ↓
        </SvgText>
      </g>
    </Canvas>
  );
};

const USES = [
  {title: '金融', text: '複数の資産・貸し倒れの同時リスク', line: 1, delay: 0, color: COLOR.blue},
  {title: '水文学', text: '洪水のピーク流量と総量の関係', line: 2, delay: 0, color: COLOR.aqua},
  {title: 'ものづくり', text: 'ばらつく条件をまとめて振る\nモンテカルロシミュレーション', line: 2, delay: 150, color: COLOR.orange},
  {title: '合成データ', text: '統計的な性質を保った\n表データを作る', line: 3, delay: 0, color: COLOR.blue},
];

export const S9A: React.FC = () => (
  <>
    {USES.map((use, index) => (
      <Box key={use.title} x={SIZE.sideMargin + (index % 2) * 560} y={185 + Math.floor(index / 2) * 215} w={535}>
        <Reveal line={use.line} delay={use.delay}>
          <Card accent={use.color} style={{height: 195, padding: '18px 26px'}}>
            <div style={{fontSize: 42, fontWeight: 800}}>{use.title}</div>
            <Label color={COLOR.text} size={30} style={{marginTop: 8, whiteSpace: 'pre'}}>
              {use.text}
            </Label>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={SIZE.sideMargin} y={620} w={1095}>
      <Reveal line={4}>
        <Card accent={COLOR.muted} style={{height: 140, padding: '14px 26px'}}>
          <Label>試すには</Label>
          <div style={{fontSize: 36, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap'}}>R の copula パッケージ、Python の statsmodels など</div>
        </Card>
      </Reveal>
    </Box>
    <Box x={1220} y={185} w={610}>
      <Reveal line={5}>
        <Card accent={COLOR.aqua} style={{height: 275}}>
          <div style={{fontSize: 44, fontWeight: 800, color: COLOR.aqua}}>強み</div>
          <Label color={COLOR.text} size={36} style={{marginTop: 10}}>
            ・仕組みが単純
            <br />
            ・変数が増えても
            <br />
            <span style={{paddingLeft: 36}}>相関行列ひとつで済む</span>
          </Label>
        </Card>
      </Reveal>
    </Box>
    <Box x={1220} y={485} w={610}>
      <Reveal line={5} delay={190}>
        <Card accent={COLOR.warning} style={{height: 275}}>
          <div style={{fontSize: 44, fontWeight: 800, color: COLOR.warning}}>弱み</div>
          <Label color={COLOR.text} size={36} style={{marginTop: 10}}>
            ・すその依存性がない
            <br />
            ・上下が対称な
            <br />
            <span style={{paddingLeft: 36}}>つながり方しか表せない</span>
          </Label>
        </Card>
      </Reveal>
    </Box>
  </>
);

const SUMMARY = [
  {title: 'コピュラ ＝ 同時分布から取り出した「つながり方」', text: 'スクラーの定理：周辺分布と組み合わせて同時分布を作れる', color: COLOR.aqua},
  {title: 'ガウシアンコピュラ ＝ 正規分布のつながり方を借りたもの', text: 'パラメータは相関行列 R だけ', color: COLOR.blue},
  {title: '作る：正規乱数 → Φ → 逆関数', text: '推定する：順位 → 正規スコア → 相関係数', color: COLOR.orange},
  {title: 'すその依存性はゼロ', text: '極端な同時発生を見るなら、t コピュラなども検討', color: COLOR.warning},
];
const REFERENCES = [
  'A. Sklar (1959) Fonctions de répartition à n dimensions et leurs marges',
  'R. B. Nelsen (2006) An Introduction to Copulas, 2nd ed., Springer',
  'D. X. Li (2000) On Default Correlation: A Copula Function Approach',
  'H. Joe (2014) Dependence Modeling with Copulas, CRC Press',
];

export const S9B: React.FC = () => (
  <>
    {SUMMARY.map((item, index) => (
      <Box key={item.title} x={SIZE.sideMargin} y={185 + index * 168} w={1100}>
        <Reveal line={index + 1}>
          <Card accent={item.color} style={{height: 152, padding: '16px 28px'}}>
            <div style={{fontSize: 37, fontWeight: 800, whiteSpace: 'nowrap'}}>{item.title}</div>
            <Label color={COLOR.subText} size={32} style={{marginTop: 6}}>
              {item.text}
            </Label>
          </Card>
        </Reveal>
      </Box>
    ))}
    <Box x={1220} y={185} w={610}>
      <Reveal line={5}>
        <Card accent={COLOR.muted} style={{height: 656, padding: '22px 26px'}}>
          <div style={{fontSize: 44, fontWeight: 800, lineHeight: 1.4, whiteSpace: 'nowrap'}}>
            ご視聴
            <br />
            ありがとうございました
          </div>
          <Label style={{marginTop: 36}} size={30}>
            参考文献
          </Label>
          {REFERENCES.map((reference) => (
            <div key={reference} style={{fontSize: 24, lineHeight: 1.4, color: COLOR.subText, marginTop: 12}}>
              {reference}
            </div>
          ))}
        </Card>
      </Reveal>
    </Box>
  </>
);
