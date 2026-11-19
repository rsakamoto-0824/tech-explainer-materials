import type React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {Main} from './Main.tsx';
import {TOTAL_FRAMES} from './timeline.ts';

// 長さは読み上げ音声で決まるので、ここで計算する
const calculateMetadata: CalculateMetadataFunction<Record<string, unknown>> = () => ({durationInFrames: TOTAL_FRAMES});

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SobolSensitivity"
    component={Main}
    durationInFrames={27000}
    fps={30}
    width={1920}
    height={1080}
    calculateMetadata={calculateMetadata}
  />
);
