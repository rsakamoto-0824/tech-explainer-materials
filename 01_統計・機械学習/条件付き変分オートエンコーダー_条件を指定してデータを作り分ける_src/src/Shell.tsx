// Shell.tsx — どの場面にも出る部品（見出し、字幕、進み具合の帯）。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, Pill, rise, stepAt, WIDTH } from './kit';
import { CHAPTERS, SCENES } from './script';
import timeline from './timeline.json';

const SCENE_FADE_FRAMES = 10;
const CAPTION_TOP = 906;
const CAPTION_HEIGHT = 140;
const PROGRESS_HEIGHT = 8;
const KIND_LABEL: Record<string, { text: string; color: string }> = {
  theory: { text: '理論', color: C.theory },
  visual: { text: '図解', color: C.visual },
};

export const SceneFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: rise(frame, 0, SCENE_FADE_FRAMES) }}>{children}</AbsoluteFill>;
};

export const Header: React.FC<{ chapter: number; kind: string; title: string }> = ({ chapter, kind, title }) => {
  const label = KIND_LABEL[kind];
  if (!title) return null;
  return (
    <div style={{ position: 'absolute', left: 80, top: 38, right: 80 }}>
      {chapter > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 6 }}>
          {label ? <Pill color={label.color}>{label.text}</Pill> : null}
          <span style={{ fontSize: 30, color: C.muted, fontWeight: 600 }}>
            第{chapter}章　{CHAPTERS[chapter - 1]}
          </span>
        </div>
      ) : null}
      <div style={{ fontSize: chapter > 0 ? 52 : 60, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
    </div>
  );
};

export const Captions: React.FC<{ lines: string[]; cues: number[] }> = ({ lines, cues }) => {
  const frame = useCurrentFrame();
  if (frame < cues[0]) return null;
  const step = stepAt(frame, cues);
  return (
    <div
      style={{
        position: 'absolute',
        left: 100,
        width: WIDTH - 200,
        top: CAPTION_TOP,
        height: CAPTION_HEIGHT,
        borderTop: `2px solid ${C.line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: 38,
        lineHeight: 1.5,
        opacity: rise(frame, cues[step], 6),
      }}
    >
      {/* 行の折り返しが語の途中に入らないよう、読点と句点の後ろだけで折り返す */}
      <span style={{ textWrap: 'balance' } as React.CSSProperties}>
        {lines[step].split(/(?<=[、。])/).map((phrase, index) => (
          <span key={index} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {phrase}
          </span>
        ))}
      </span>
    </div>
  );
};

// 章ごとに区切った帯。章の外（題名・ポイント・整理・まとめ）は灰色
const SEGMENTS = (() => {
  const segments: { from: number; to: number; chapter: number }[] = [];
  timeline.scenes.forEach((timing, index) => {
    const chapter = SCENES[index].chapter;
    const last = segments[segments.length - 1];
    if (last && last.chapter === chapter) last.to = timing.from + timing.duration;
    else segments.push({ from: timing.from, to: timing.from + timing.duration, chapter });
  });
  return segments;
})();

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const total = timeline.total;
  return (
    <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: PROGRESS_HEIGHT, background: '#121211' }}>
      {SEGMENTS.map((segment) => (
        <div
          key={segment.from}
          style={{
            position: 'absolute',
            top: 0,
            height: '100%',
            left: `${(100 * segment.from) / total}%`,
            width: `${(100 * (segment.to - segment.from)) / total}%`,
            background: segment.chapter === 0 ? '#4a4a46' : segment.chapter % 2 === 1 ? '#5b5596' : '#1d6b52',
            boxShadow: 'inset -2px 0 0 #121211',
          }}
        />
      ))}
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(100 * frame) / total}%`, background: 'rgba(240,239,236,0.6)' }} />
    </div>
  );
};
