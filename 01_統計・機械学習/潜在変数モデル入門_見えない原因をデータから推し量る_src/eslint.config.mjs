import { config } from "@remotion/eslint-config-flat";

// 画面の日本語には全角の空白を使うので、その検査だけ外す
export default [...config, { rules: { "no-irregular-whitespace": "off" } }];
