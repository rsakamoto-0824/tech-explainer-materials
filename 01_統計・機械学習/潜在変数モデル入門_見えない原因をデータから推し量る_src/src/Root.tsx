import './fonts';
import { Composition } from 'remotion';
import { Main } from './Main';
import timeline from './timeline.json';

// 長さは読み上げ音声から決まる（tools/voice.mjs が src/timeline.json に書く）
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="LatentVariableModels" component={Main} durationInFrames={timeline.total} fps={30} width={1920} height={1080} />
    </>
  );
};
