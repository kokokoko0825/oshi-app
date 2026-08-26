# Electron 43 への更新と Dependabot（2026-08-26）

## 意図

- サポート切れの Electron 39 から、サポート中の **43.4.1** へ上げる
- ホスト Node を **22 / 24** に揃え、公開リポジトリでも再現しやすい状態にする
- Dependabot で今後も安全に上げ続けられるようにする

## なぜ 43 か

| 候補 | 判断 |
| --- | --- |
| 44（最新） | 同梱 Node 24・macOS 13+ 必須など変化が大きい。直後の安定確認コストが高い |
| **43.4.1** | サポート中、同梱 Node 24、ホスト `>=22.12`。今回の「いい感じ」に最も合う |
| 39 | サポート終了済み |

## 今回上げたもの / 据え置いたもの

上げた:

- `electron` 39.2.7 → **43.4.1**
- `electron-builder` → 26.15.3
- `react` / `react-dom` / 型定義のパッチ
- `prettier` / `eslint-plugin-react-hooks` / `eslint-plugin-react-refresh`

据え置き（メジャー破壊が大きいか、ツール未対応）:

- `vite` 7（electron-vite 5 は Vite 8 未対応）
- `typescript` 5
- `eslint` 9

## Dependabot の使い方

1. `.github/dependabot.yml` を `main` にマージする（GitHub が自動で有効化）
2. 毎週月曜に npm 更新 PR、月次で GitHub Actions 更新 PR が来る
3. Electron 系 / React 系 / Vite 系はグループ化されてまとまる
4. Vite / ESLint / TypeScript の **メジャー** は ignore 済み → 手動で検討

PR が来たら:

```bash
# PR ブランチを checkout して
pnpm install
pnpm typecheck
pnpm ensure:electron
pnpm check:node-alignment
pnpm exec electron-vite build
# 問題なければマージ
```

`pnpm check:node-alignment` は Electron 同梱 Node と `engines.node` / `.nvmrc` / `.node-version` / CI の matrix がズレていたら落とす。Dependabot が `electron` だけ上げたときの更新漏れ検知用。CI にも組み込み済み。

Electron のメジャー（例: 43 → 44）は Dependabot PR でも来るが、[Breaking Changes](https://www.electronjs.org/docs/latest/breaking-changes) を読んでからマージする。

## 補足

- ローカルが Node 26 だと `engine-strict` で拒否される。このリポジトリでは 22/24 を使う
- `scripts/ensure-electron.mjs` は展開失敗時の保険として残している
