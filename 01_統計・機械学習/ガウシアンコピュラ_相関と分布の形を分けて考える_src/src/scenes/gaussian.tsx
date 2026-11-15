// 第4章（ガウシアンコピュラの定義）と、ここまでの整理
import type React from 'react';
import {Box, Card, Label, Reveal} from '../components/Layout.tsx';
import {Arrow, Canvas, Dots, PlotFrame, SvgText} from '../components/plot.tsx';
import {Tex} from '../components/Tex.tsx';
import {SAMPLE_COUNT, SAMPLES, zPair} from '../lib/data.ts';
import {normalCdf, waitPdf} from '../lib/stats.ts';
import {COLOR, FONT, SIZE} from '../theme.ts';
import {mix, useLines} from '../timeline.ts';
import {blendPoints, format1, MiniCurve, MiniScatter, toPixels, UNIT_DOMAIN, UNIT_TICKS, Z_DOMAIN, Z_TICKS} from './shared.tsx';

const FAMILIES = ['ガウシアン', 't', 'クレイトン', 'ガンベル', 'フランク'];
const MINI_COUNT = 110;
const MINI_NORMAL: [number, number][] = SAMPLES.slice(0, MINI_COUNT).map((s) => [(s.z1 + 3.2) / 6.4, (s.z2 + 3.2) / 6.4]);
const MINI_COPULA: [number, number][] = SAMPLES.slice(0, MINI_COUNT).map((s) => [s.u1, s.u2]);
const miniCopula = (rho: number): [number, number][] =>
  Array.from({length: MINI_COUNT}, (_, i) => {
    const [z1, z2] = zPair(i, rho);
    return [normalCdf(z1), normalCdf(z2)];
  });

export const S4T: React.FC = () => (
  <>
    <Box x={SIZE.sideMargin} y={182} w={1740}>
      <Reveal line={0}>
        <div style={{display: 'flex', gap: 22, alignItems: 'center', fontFamily: FONT}}>
          <Label>コピュラの種類</Label>
          {FAMILIES.map((family, index) => (
            <div
              key={family}
              style={{
                fontSize: 36,
                fontWeight: 700,
                padding: '8px 28px',
                borderRadius: 40,
                border: `3px solid ${index === 0 ? COLOR.blue : COLOR.panelLine}`,
                backgroundColor: index === 0 ? COLOR.blue : 'transparent',
                color: index === 0 ? COLOR.backgroundDeep : COLOR.subText,
              }}
            >
              {family}
            </div>
          ))}
        </div>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={275} w={1740}>
      <Reveal line={1}>
        <div style={{display: 'flex', alignItems: 'center', gap: 28, fontFamily: FONT, color: COLOR.text}}>
          <MiniScatter points={MINI_NORMAL} size={150} color={COLOR.subText} />
          <div style={{fontSize: 40, fontWeight: 700}}>
            相関のある
            <br />
            多変量正規分布
          </div>
          <div style={{textAlign: 'center', margin: '0 20px'}}>
            <Label color={COLOR.blue}>つながり方だけを借りる</Label>
            <div style={{fontSize: 64, color: COLOR.blue, lineHeight: 1}}>→</div>
          </div>
          <MiniScatter points={MINI_COPULA} size={150} />
          <div style={{fontSize: 40, fontWeight: 800}}>
            ガウシアン
            <br />
            コピュラ
          </div>
        </div>
      </Reveal>
    </Box>
    <Box x={SIZE.sideMargin} y={462} w={1110}>
      <Reveal line={2}>
        <Card accent={COLOR.blue} style={{height: 395}}>
          <div style={{textAlign: 'center', marginTop: 14}}>
            <Tex
              tex={`C_R(u_1,u_2)=\\textcolor{${COLOR.blue}}{\\Phi_R}\\big(\\textcolor{${COLOR.orange}}{\\Phi^{-1}}(u_1),\\ \\textcolor{${COLOR.orange}}{\\Phi^{-1}}(u_2)\\big)`}
              size={50}
            />
          </div>
          <div style={{marginTop: 34, display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 16, alignItems: 'center'}}>
            <Tex tex={`\\textcolor{${COLOR.orange}}{\\Phi^{-1}}`} size={42} />
            <Label color={COLOR.text}>0〜1 の値を、標準正規分布の値に直す</Label>
          </div>
          <Reveal line={3}>
            <div style={{marginTop: 16, display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center'}}>
              <Tex tex={`\\textcolor{${COLOR.blue}}{\\Phi_R}`} size={42} />
              <Label color={COLOR.text}>
                相関行列 R の多変量正規分布の
                <br />
                累積分布関数
              </Label>
            </div>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
    <Box x={1230} y={462} w={600}>
      <Reveal line={4}>
        <Card accent={COLOR.aqua} style={{height: 395, padding: '20px 30px'}}>
          <Label color={COLOR.text}>パラメータは相関行列 R だけ</Label>
          <div style={{textAlign: 'center', marginTop: 4}}>
            <Tex tex="R=\begin{pmatrix}1&\rho\\ \rho&1\end{pmatrix}" size={42} />
          </div>
          <Reveal line={5}>
            <Label style={{marginTop: 6}}>3変数以上でも同じ式</Label>
          </Reveal>
          <Reveal line={6}>
            <div style={{display: 'flex', gap: 26, marginTop: 6, alignItems: 'flex-end'}}>
              {[0, 0.5, 0.9].map((rho) => (
                <div key={rho} style={{textAlign: 'center'}}>
                  <MiniScatter points={miniCopula(rho)} size={84} />
                  <Label size={26}>ρ = {rho}</Label>
                </div>
              ))}
            </div>
          </Reveal>
        </Card>
      </Reveal>
    </Box>
  </>
);

const INDEXES = Array.from({length: SAMPLE_COUNT}, (_, i) => i);

export const S4V: React.FC = () => {
  const {rise, sweep} = useLines();
  const leftRect = {x: 240, y: 255, w: 520, h: 520};
  const rightRect = {x: 1180, y: 255, w: 520, h: 520};
  // 相関係数を 0.7 → 0 → -0.7 → 0.95 と動かす
  const rho = mix(mix(mix(0.7, 0, sweep(2, 0.05, 0.4)), -0.7, sweep(3, 0.05, 0.5)), 0.95, sweep(4, 0.05, 0.4));
  const pairs = INDEXES.map((i) => zPair(i, rho));
  const zPoints = toPixels(leftRect, Z_DOMAIN, Z_DOMAIN, pairs.map((p) => p[0]), pairs.map((p) => p[1]));
  const uPoints = toPixels(rightRect, UNIT_DOMAIN, UNIT_DOMAIN, pairs.map((p) => normalCdf(p[0])), pairs.map((p) => normalCdf(p[1])));
  const fly = sweep(1, 0.12, 0.5);
  const centerY = leftRect.y + leftRect.h / 2;
  return (
    <>
      <Canvas>
        <g opacity={rise(0)}>
          <PlotFrame rect={leftRect} xDomain={Z_DOMAIN} yDomain={Z_DOMAIN} xTicks={Z_TICKS} yTicks={Z_TICKS} xLabel="z₁" yLabel="z₂" title="2変量正規分布" />
          <Dots points={zPoints} />
        </g>
        <g opacity={rise(1)}>
          <Arrow x1={850} y1={centerY + 60} x2={1050} y2={centerY + 60} color={COLOR.text} width={7} />
          <SvgText x={950} y={centerY + 10} size={SIZE.small} color={COLOR.text} weight={700}>
            Φ をかける
          </SvgText>
          <PlotFrame rect={rightRect} xDomain={UNIT_DOMAIN} yDomain={UNIT_DOMAIN} xTicks={UNIT_TICKS} yTicks={UNIT_TICKS} xLabel="u₁ = Φ(z₁)" yLabel="u₂ = Φ(z₂)" title="ガウシアンコピュラ" titleColor={COLOR.text} format={format1} />
          <Dots points={blendPoints(zPoints, uPoints, fly)} />
        </g>
      </Canvas>
      <Box x={790} y={300} w={360} style={{textAlign: 'center'}}>
        <Reveal line={0}>
          <Label>相関係数</Label>
          <Tex tex={`\\rho=${rho.toFixed(2)}`} size={62} color={COLOR.text} />
        </Reveal>
      </Box>
    </>
  );
};

const RECAP = [
  {title: '形を消す', text: ['累積分布関数 F で、', '0〜1 の一様分布に直す'], color: COLOR.orange},
  {title: 'コピュラ', text: ['一様分布に直したあとに残る', 'つながり方'], color: COLOR.aqua},
  {title: 'ガウシアンコピュラ', text: ['そのつながり方を', '正規分布から借りたもの'], color: COLOR.blue},
];

export const S4R: React.FC = () => (
  <>
    {RECAP.map((item, index) => (
      <Box key={item.title} x={SIZE.sideMargin + index * 590} y={215} w={560}>
        <Reveal line={index + 1}>
          <Card accent={item.color} style={{height: 600, padding: '28px 30px', textAlign: 'center'}}>
            <div style={{fontSize: 80, fontWeight: 800, color: item.color, lineHeight: 1}}>{index + 1}</div>
            <div style={{fontSize: 46, fontWeight: 800, marginTop: 14}}>{item.title}</div>
            <div style={{height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14}}>
              {index === 0 ? (
                <>
                  <MiniCurve f={waitPdf} domain={[0, 90]} maxValue={0.052} width={180} height={120} color={COLOR.orange} />
                  <div style={{fontSize: 54, color: COLOR.text}}>→</div>
                  <MiniCurve f={() => 1} domain={[0, 1]} maxValue={1.6} width={180} height={120} color={COLOR.orange} />
                </>
              ) : null}
              {index === 1 ? <MiniScatter points={MINI_COPULA} size={210} color={COLOR.aqua} /> : null}
              {index === 2 ? (
                <>
                  <MiniScatter points={MINI_NORMAL} size={190} color={COLOR.subText} />
                  <div style={{fontSize: 54, color: COLOR.text}}>→</div>
                  <MiniScatter points={MINI_COPULA} size={190} />
                </>
              ) : null}
            </div>
            {item.text.map((line) => (
              <Label key={line} color={COLOR.text} style={{marginTop: 8}}>
                {line}
              </Label>
            ))}
          </Card>
        </Reveal>
      </Box>
    ))}
  </>
);
