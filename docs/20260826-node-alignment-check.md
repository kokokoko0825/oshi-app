# Node / Electron 整合チェック（2026-08-26）

## 意図

Dependabot が `electron` だけ上げたとき、同梱 Node に合わせてホスト側の Node 指定（`engines` / `.nvmrc` / CI）を直し忘れるのを防ぐ。

## 何を見るか

`pnpm check:node-alignment`（`scripts/check-node-alignment.mjs`）:

1. Electron バイナリの `process.versions.node`（同梱 Node）
2. `package.json` の `engines.node`
3. `.nvmrc` / `.node-version`
4. `.github/workflows/ci.yml` の `node` matrix

失敗条件の例:

- 同梱 Node のメジャーが `engines` に無い（Electron が 26 同梱なのに engines が 22/24 のまま）
- CI matrix に同梱 Node メジャーが無い
- `.nvmrc` が engines の範囲外

## 使い方

```bash
pnpm ensure:electron
pnpm check:node-alignment
```

CI の `Ensure Electron binary` の直後に自動実行される。
