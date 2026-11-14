// Main.tsx — 場面を時刻表（src/timeline.json）の順に並べる。
// 場面の長さは読み上げ音声から自動で決まるので、ここでは一覧から機械的に並べている（Studio の画面で1つずつ動かす対象にはしていない）。
import { Audio } from '@remotion/media';
import React from 'react';
import { AbsoluteFill, Sequence, staticFile } from 'remotion';
import { C, FONT } from './kit';
import { SCENE_COMPONENTS } from './scenes';
import { SCENES } from './script';
import { Captions, Header, ProgressBar, SceneFade } from './Shell';
import timeline from './timeline.json';

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.text, fontFamily: FONT }}>
      {timeline.scenes.map((timing, index) => {
        const scene = SCENES[index];
        const SceneComponent = SCENE_COMPONENTS[scene.id];
        return (
          <Sequence key={scene.id} name={`${scene.id} ${scene.title}`} from={timing.from} durationInFrames={timing.duration}>
            <SceneFade>
              <Header chapter={scene.chapter} kind={scene.kind} title={scene.title} />
              <SceneComponent cues={timing.cues} />
            </SceneFade>
            <Captions lines={scene.lines.map((line) => line.t)} cues={timing.cues} />
            <Audio src={staticFile(`voice/${scene.id}.wav`)} />
          </Sequence>
        );
      })}
      <ProgressBar />
    </AbsoluteFill>
  );
};
