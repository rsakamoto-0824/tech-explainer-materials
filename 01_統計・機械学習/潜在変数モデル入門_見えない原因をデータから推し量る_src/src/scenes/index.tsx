// index.tsx — 場面の id（src/script.ts）と、その画面を描く部品の対応。
import React from 'react';
import { Intro, Points, Scene1T, Scene1V, Scene2G, Scene2T, Scene2V, type SceneProps } from './part1';
import { Scene3T, Scene3V, Scene4C, Scene4P, Scene4T, Scene4V } from './part2';
import { Mid, Scene5E, Scene5L, Scene5M, Scene5T, Scene5V } from './part3';
import { Scene6T, Scene6V, Scene7V, Scene8T, Scene8V, Summary } from './part4';

export const SCENE_COMPONENTS: Record<string, React.FC<SceneProps>> = {
  intro: Intro,
  points: Points,
  '1T': Scene1T,
  '1V': Scene1V,
  '2T': Scene2T,
  '2G': Scene2G,
  '2V': Scene2V,
  '3T': Scene3T,
  '3V': Scene3V,
  '4T': Scene4T,
  '4C': Scene4C,
  '4P': Scene4P,
  '4V': Scene4V,
  '5L': Scene5L,
  '5T': Scene5T,
  '5E': Scene5E,
  '5V': Scene5V,
  '5M': Scene5M,
  mid: Mid,
  '6T': Scene6T,
  '6V': Scene6V,
  '7V': Scene7V,
  '8T': Scene8T,
  '8V': Scene8V,
  summary: Summary,
};
