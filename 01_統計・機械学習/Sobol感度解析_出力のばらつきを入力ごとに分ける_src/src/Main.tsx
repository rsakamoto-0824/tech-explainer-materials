// 動画の本体：場面を読み上げの長さどおりに並べ、音声を重ねる
import {Audio} from '@remotion/media';
import type React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Background, Caption, Header, ProgressBar, VoiceCredit} from './components/Layout.tsx';
import {SCENE_COMPONENTS} from './scenes/index.ts';
import {SCENE_LAYOUTS, SceneContext} from './timeline.ts';

export const Main: React.FC = () => (
  <AbsoluteFill>
    <Background />
    {SCENE_LAYOUTS.map((layout) => {
      const Scene = SCENE_COMPONENTS[layout.def.id];
      return (
        <Sequence key={layout.def.id} name={`${layout.def.id} ${layout.def.title}`} from={layout.from} durationInFrames={layout.durationInFrames}>
          <SceneContext.Provider value={layout}>
            {layout.def.id === 'S00' ? null : <Header />}
            {Scene ? <Scene /> : null}
            <Caption />
            <ProgressBar sceneFrom={layout.from} />
          </SceneContext.Provider>
          <Audio name={`声 ${layout.def.id}`} src={staticFile(`voice/${layout.def.id}.wav`)} />
        </Sequence>
      );
    })}
    <VoiceCredit />
  </AbsoluteFill>
);
