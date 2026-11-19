// 場面の id と、画面を描く部品の対応
import type React from 'react';
import {S4T, S4V, S5T, S5V} from './distribution.tsx';
import {S00, S01, S1T, S1V} from './intro.tsx';
import {S6T, S6V, S7T, S7V, S8A, S8B} from './practice.tsx';
import {S2T, S2V, S3T, S3V} from './screening.tsx';

export const SCENE_COMPONENTS: Record<string, React.FC> = {
  S00, S01, S1T, S1V, S2T, S2V, S3T, S3V, S4T, S4V, S5T, S5V, S6T, S6V, S7T, S7V, S8A, S8B,
};
