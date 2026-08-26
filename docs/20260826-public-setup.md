# 公開リポジトリとして誰でも使えるようにする対応（2026-08-26）

## 意図

public な GitHub リポジトリとして、クローンした人が環境差でつまずかずに `pnpm install` → `pnpm dev` できるようにする。

## 起きていた問題

1. **Node 26** だと Electron 公式の `extract-zip` が zip64 を不完全展開し、`path.txt` / `Electron.app` が欠ける
2. pnpm の `ignoredBuiltDependencies` があると Electron の postinstall がスキップされる
3. README に Node / pnpm の前提が無く、再現手順が曖昧

## 選択した方針

| 方針 | 理由 |
| --- | --- |
| Node **22 LTS** を必須化（`engines` + `engine-strict`） | Electron 39 の想定ランタイム。根本原因を潰す |
| `.nvmrc` / `.node-version` | nvm / fnm / asdf が自動で合わせられる |
| `packageManager` + Corepack | pnpm 版のばらつきを減らす |
| `scripts/ensure-electron.mjs` | 公式 install が失敗してもプロジェクト内だけで修復 |
| キャッシュを `.cache/electron` に閉じる | ユーザーのホームを汚さない・再現しやすい |
| GitHub Actions（mac/linux/win × Node 22） | 「誰でも使える」を CI で担保 |
| `onlyBuiltDependencies` に electron | pnpm がバイナリ取得を確実に実行する |

## 利用者の最短手順

```bash
git clone https://github.com/kokokoko0825/oshi-app.git
cd oshi-app
# Node 22
corepack enable
pnpm install
pnpm dev
```

## メンテ時の注意

- ローカルが Node 26 のままだと `engine-strict` で install が拒否される → このリポジトリでは Node 22 を使う
- Electron / pnpm のメジャー上げ時は CI と `engines` を同時に更新する
