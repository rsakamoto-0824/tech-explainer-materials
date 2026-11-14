// 場面の id と、画面を描く部品の対応
import type React from 'react';
import {S2T, S2V, S3T, S3V} from './basics.tsx';
import {S5T, S5V, S6T, S6V, S7T, S7V} from './flow.tsx';
import {S4R, S4T, S4V} from './gaussian.tsx';
import {S00, S01, S1T, S1V} from './intro.tsx';
import {S8T, S8V, S9A, S9B} from './tail.tsx';

export const SCENE_COMPONENTS: Record<string, React.FC> = {
  S00, S01, S1T, S1V, S2T, S2V, S3T, S3V, S4T, S4V, S4R, S5T, S5V, S6T, S6V, S7T, S7V, S8T, S8V, S9A, S9B,
};
