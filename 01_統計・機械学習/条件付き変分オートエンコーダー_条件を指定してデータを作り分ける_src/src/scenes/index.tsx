// index.tsx — 場面の id（src/script.ts）と、その画面を描く部品の対応。
import React from 'react';
import { Intro, Points, Scene1T, Scene1V, Scene2L, Scene2V, type SceneProps } from './part1';
import { Scene3T, Scene3V, Scene4K, Scene4T, Scene4V } from './part2';
import { Mid, Scene5T, Scene5V, Scene6V } from './part3';
import { Scene6L, Scene6S, Scene7C, Scene7T, Summary } from './part4';

export const SCENE_COMPONENTS: Record<string, React.FC<SceneProps>> = {
  intro: Intro,
  points: Points,
  '1T': Scene1T,
  '1V': Scene1V,
  '2V': Scene2V,
  '2L': Scene2L,
  '3T': Scene3T,
  '3V': Scene3V,
  '4T': Scene4T,
  '4K': Scene4K,
  '4V': Scene4V,
  '5T': Scene5T,
  '5V': Scene5V,
  mid: Mid,
  '6V': Scene6V,
  '6L': Scene6L,
  '6S': Scene6S,
  '7T': Scene7T,
  '7C': Scene7C,
  summary: Summary,
};
