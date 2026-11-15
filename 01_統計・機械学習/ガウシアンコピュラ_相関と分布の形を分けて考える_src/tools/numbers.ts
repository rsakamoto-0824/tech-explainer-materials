// 台本に書く数値を表示する: node tools/numbers.ts
import * as d from '../src/lib/data.ts';
import {gaussianTailProbability, t3TailProbability} from '../src/lib/stats.ts';
console.log('tracked', d.TRACKED);
console.log('raw corr', d.RAW_CORRELATION, 'log corr', d.LOG_CORRELATION, 'score corr', d.SCORE_CORRELATION);
console.log('top counts', d.TOP_COUNT_GAUSS, d.TOP_COUNT_T, 'expected', d.TAIL_COUNT * 0.01 * gaussianTailProbability(0.99, 0.7), d.TAIL_COUNT * 0.01 * t3TailProbability(0.99, 0.7));
console.log(d.TAIL_CURVE.filter((_, i) => i % 10 === 0));
console.log('wait max', Math.max(...d.SAMPLES.map((s) => s.wait)));
