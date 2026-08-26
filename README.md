# oshi-app

Electron + React + TypeScript のデスクトップアプリです。

## 必要なもの

| ツール | バージョン | 備考 |
| --- | --- | --- |
| Node.js | **22 または 24**（`^22.14.0 \|\| ^24.0.0`） | Electron 43 は実行時 Node 24。ホストは 22/24 を推奨 |
| pnpm | 9 以上（推奨 11.15.0） | `corepack enable` 後に自動で揃う |

バージョン固定ファイル:

- `.nvmrc` / `.node-version` → `22`
- `package.json` の `engines` / `packageManager`
- Electron → `43.4.1`

## セットアップ

```bash
git clone https://github.com/kokokoko0825/oshi-app.git
cd oshi-app

# Node 22 または 24 に合わせる（どれか一つ）
# nvm use
# fnm use
# asdf install && asdf shell node 22

corepack enable
pnpm install
pnpm dev
```

`pnpm install` と `pnpm dev` の前後で Electron 本体の有無を自動チェックします。壊れていればプロジェクト内の `.cache/electron` から再展開します。

## 使い方

1. 画像を `src/renderer/src/picture/` に置く
2. `pnpm dev`
3. 十字キー上下でサイズ、左右で画像切替

## ビルド

```bash
pnpm build:mac    # macOS
pnpm build:win    # Windows
pnpm build:linux  # Linux
```

## トラブルシュート

**`Error: Electron uninstall` / `ENOENT .../Electron`**

```bash
pnpm ensure:electron
pnpm dev
```

まだダメなときは `node -v` が 22/24 系か確認し、`rm -rf node_modules .cache && pnpm install` をやり直す。

**`engine-strict` で install が止まる**

Node が 22/24 以外です。`.nvmrc` に合わせてください。

## IDE

- [VSCode](https://code.visualstudio.com/) + ESLint + Prettier
