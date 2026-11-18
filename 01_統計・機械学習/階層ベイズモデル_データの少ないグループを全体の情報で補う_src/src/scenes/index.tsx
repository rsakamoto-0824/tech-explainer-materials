// index.tsx — 場面の id（src/script.ts）と、その画面を描く部品の対応。
import React from 'react';
import { Intro, Points, Scene1C, Scene1T, Scene1V, type SceneProps } from './part1';
import { Scene2T, Scene2V, Scene3T, Scene3V } from './part2';
import { Mid, Scene4E, Scene4K, Scene4T, Scene4V } from './part3';
import { Scene5C, Scene5G, Scene5H, Scene5T } from './part4';
import { Scene6D, Scene6R, Scene6V, Scene6W } from './part5';
import { Scene7C, Scene7F, Scene7T, Summary } from './part6';

export const SCENE_COMPONENTS: Record<string, React.FC<SceneProps>> = {
  intro: Intro,
  points: Points,
  '1V': Scene1V,
  '1T': Scene1T,
  '1C': Scene1C,
  '2T': Scene2T,
  '2V': Scene2V,
  '3T': Scene3T,
  '3V': Scene3V,
  '4T': Scene4T,
  '4K': Scene4K,
  '4V': Scene4V,
  '4E': Scene4E,
  mid: Mid,
  '5T': Scene5T,
  '5G': Scene5G,
  '5C': Scene5C,
  '5H': Scene5H,
  '6V': Scene6V,
  '6W': Scene6W,
  '6R': Scene6R,
  '6D': Scene6D,
  '7T': Scene7T,
  '7F': Scene7F,
  '7C': Scene7C,
  summary: Summary,
};
