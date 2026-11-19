// 読み上げの長さ（src/timings.json）から、場面と行の開始フレームを決める
import {createContext, useContext} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {SCENES, type SceneDef} from './script.ts';
import timings from './timings.json';

export const FPS = 30;
const APPEAR_FRAMES = 16;

type Timing = {total: number; lines: {start: number; duration: number}[]};
const TIMINGS = timings as Record<string, Timing>;

export type SceneLayout = {
  def: SceneDef;
  from: number;
  durationInFrames: number;
  lineStarts: number[]; // 行の開始フレーム（場面の頭が0）
  lineEnds: number[];
};

let cursor = 0;
export const SCENE_LAYOUTS: SceneLayout[] = SCENES.map((def) => {
  const timing = TIMINGS[def.id];
  if (!timing || timing.lines.length !== def.lines.length) {
    throw new Error(`timings.json が台本と合いません（${def.id}）。node tools/voice.ts を実行してください`);
  }
  const durationInFrames = Math.round(timing.total * FPS);
  const layout = {
    def,
    from: cursor,
    durationInFrames,
    lineStarts: timing.lines.map((l) => Math.round(l.start * FPS)),
    lineEnds: timing.lines.map((l) => Math.round((l.start + l.duration) * FPS)),
  };
  cursor += durationInFrames;
  return layout;
});
export const TOTAL_FRAMES = cursor;

export const SceneContext = createContext<SceneLayout | null>(null);

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const SMOOTH = Easing.bezier(0.45, 0, 0.55, 1);

// 場面の中で、行の時刻をもとに動きを決めるための道具
export const useLines = () => {
  const layout = useContext(SceneContext);
  if (!layout) throw new Error('SceneContext がありません');
  const frame = useCurrentFrame();
  // 行 index の開始フレーム。fraction で行の途中（0〜1）を指定できる
  const at = (index: number, fraction = 0) => {
    const start = layout.lineStarts[Math.min(index, layout.lineStarts.length - 1)];
    const end = layout.lineEnds[Math.min(index, layout.lineEnds.length - 1)];
    return start + (end - start) * fraction;
  };
  // 行 index が始まると 0 → 1 に上がる値（現れる動き用）
  const rise = (index: number, delayFrames = 0, lengthFrames = APPEAR_FRAMES) =>
    interpolate(frame, [at(index) + delayFrames, at(index) + delayFrames + lengthFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE,
    });
  // 行 index の fromFraction〜toFraction のあいだで 0 → 1 にゆっくり進む値（移動や変形用）
  const sweep = (index: number, fromFraction = 0.05, toFraction = 0.8) =>
    interpolate(frame, [at(index, fromFraction), at(index, toFraction)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: SMOOTH,
    });
  const currentLine = layout.lineStarts.reduce((found, start, index) => (frame >= start ? index : found), -1);
  return {frame, at, rise, sweep, currentLine, layout};
};

export const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;
