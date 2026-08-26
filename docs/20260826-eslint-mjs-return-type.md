# ESLint: `.mjs` の return type 誤爆を止める（2026-08-26）

## 意図

`scripts/ensure-electron.mjs` と `scripts/check-node-alignment.mjs` が IDE / `pnpm lint` で赤くなっていた。実行は通っていたが、TypeScript 用ルールが JS にかかっていた。

## 原因

`@electron-toolkit/eslint-config-ts` は `@typescript-eslint/explicit-function-return-type` を error にし、`.js` / `.mjs` では off にする。ただし glob が `*.mjs`（ルート直下のみ）のため、`scripts/*.mjs` には効かない。

例: `function isHealthy(...) {` に戻り値型が無い、と出る。`.mjs` には型注釈を書けないので誤爆。

## 選択理由

スクリプトを `.ts` にしない。Node からそのまま叩く保険スクリプトなので変換を増やさない。ESLint 側で `**/*.{js,mjs}` を off にする。
