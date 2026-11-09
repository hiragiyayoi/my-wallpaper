# DJ Turntable Live Wallpaper

クロスプラットフォームで動作するライブ壁紙アプリケーション。
DJ ターンテーブルをモチーフとした UI で、背景画像・動画再生・時計表示を提供します。

## 特徴

- **背景画像選択**: 任意の JPEG / PNG / WebP / GIF を背景に設定 (IndexedDB に永続化)
- **動画再生 + ターンテーブル UI**: HTML5 video を DJ ターンテーブル (レコード回転) メタファーで表示
  - 動画タイトル・制作者名 (チャンネル名) 表示
  - 再生 / 一時停止 / 音量 / シーク操作
- **時計表示**: OS システム時計をリアルタイム表示 (12/24 時間切替、日付・曜日)
- **クロスプラットフォーム**: Windows (Wallpaper Engine / Lively) / Linux (awww / mpvpaper) / macOS (Plash)
- **パフォーマンス**: CSS アニメーション制御、省電力モード対応

## 技術スタック

| レイヤー | 技術 |
|---|---|
| 言語 | TypeScript |
| ビルド | Vite |
| 描画 | CSS3 Animation (Canvas API は使用しない) |
| 動画再生 | HTML5 `<video>` |
| 時計 | JavaScript `Date` / `Intl.DateTimeFormat` |
| ストレージ | IndexedDB (localStorage は使用しない) |
| 開発環境 | Nix (home-manager) |

## 開発環境セットアップ

### Nix を使用する場合

```bash
# Nix daemon を有効化
. /nix/var/nix/profiles/default/etc/profile.d/nix.sh

# home-manager を適用 (初回のみ)
cd ~/nix-config && nix flake check && home-manager switch --flake .#user
```

### Node.js / npm

```bash
# 依存関係をインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト
npm test
```

## プロジェクト構成

```
my-wallpaper/
├── REQUIREMENTS.md      # 要件定義書 (v2.3)
├── DESIGN.md            # 内部設計 (未承認ドラフト)
├── README.md            # 本ファイル
├── flake.nix            # Nix dev shell (Node 24)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   ├── project.json         # Wallpaper Engine 用
│   └── livelyproperties.json # Lively 用
├── scripts/
│   ├── render-fallback.mjs  # Tier 2 用スクリーンショット生成
│   └── export-video.mjs     # mpvpaper 用動画書き出し
├── src/
│   ├── main.ts              # エントリーポイント
│   ├── app.ts               # 表示モード / 設定モードの組み立て
│   ├── types.ts             # WallpaperConfig など
│   ├── core/                # DOM 非依存のロジック (時計・再生状態・検証・メタデータ)
│   ├── ui/                  # DOM ビュー (背景・ターンテーブル・時計・設定パネル)
│   ├── adapters/            # ホスト固有 API の隔離層
│   ├── storage/             # IndexedDB / メモリドライバ
│   └── styles/theme.css
└── dist/                # ビルド成果物
```

## ホスト別 Tier 分類

| Tier | ホスト | HTML/JS | 動画再生 | 時計 |
|---|---|---|---|---|
| Tier 1 (Full) | Wallpaper Engine (Win) | ✅ | webm/ogg/ogv | ✅ |
| Tier 1 (Full) | Lively Wallpaper (Win) | ✅ | mp4/webm/avi 等 | ✅ |
| Tier 1 (Full) | Plash (macOS) | ✅ | WebKit 対応形式 | ✅ |
| Tier 2 (Partial) | awww (Linux) | ❌ | ❌ | ❌ |
| Tier 2 (Partial) | mpvpaper (Linux) | ❌ | mpv 経由 | ❌ |
| Tier 3 (Minimal) | hyprpaper (Linux) | ❌ | ❌ | ❌ |

## ライブ壁紙としての使用

### Windows (Wallpaper Engine)

```bash
npm run build
```

1. `dist/` の中身と `project.json` を Wallpaper Engine のプロジェクトフォルダに配置
2. Wallpaper Engine エディタで `index.html` を開く
3. 動画は **webm / ogg / ogv のみ**対応 (mp4 は使用しない / WE-006)

### Windows (Lively Wallpaper)

```bash
npm run build
```

1. `dist/` フォルダを Lively にドラッグ&ドロップ
2. `livelyproperties.json` により設定項目が表示される

### Linux (Tier 2 / Tier 3: HTML を実行できないホスト)

```bash
# 静止画フォールバック (awww / hyprpaper)
npm run build
npm run fallback:render          # Playwright が必要
awww img dist/fallback/screenshot-1920x1080.png

# 動画フォールバック (mpvpaper)
npm run fallback:video -- ./my-set.webm
mpvpaper -o "no-audio --loop" '*' dist/fallback/my-set.webm
```

### macOS (Plash)

Plash の設定から `dist/index.html` を指定する。
設定ページと表示ページが同一オリジンの場合のみ IndexedDB を共有できる (UD-003)。

## 操作

| 操作 | 方法 |
|---|---|
| 設定パネルを開く | 右下の「設定」ボタン / `S` キー |
| 設定パネルを閉じる | 「閉じる」ボタン / `Esc` キー |
| 背景画像・動画の指定 | 設定パネル内のファイル選択、またはドラッグ&ドロップ |

壁紙はデスクトップの背後に表示されるため、ホスト上での直接操作は限定的です。
設定はホストのプロパティパネル (Wallpaper Engine / Lively) から行うのが基本です。

## 開発

```bash
npm install
npm run dev         # 開発サーバー
npm test            # 155+ テスト
npm run typecheck   # tsc --noEmit
npm run build       # 型チェック + 本番ビルド
npm run preview     # ビルド成果物のプレビュー
```

Nix を使う場合:

```bash
direnv allow        # .envrc を承認
# または
nix develop
```

## 実装状況

| 要件 | 状態 |
|---|---|
| F-001 背景画像選択・永続化 | ✅ 実装済み |
| F-002 動画再生 + ターンテーブル UI | ✅ 実装済み |
| F-003 時計 (12/24h・日付) | ✅ 実装済み |
| F-004 デザイン (CSS アニメーション) | ✅ 実装済み |
| F-005 設定の永続化・復元 | ✅ 実装済み |
| M-001〜M-018 モード分離 | ✅ 実装済み |
| NF-001〜NF-015 | 実機測定は未実施 |
| WE-001〜WE-006 | project.json 同梱済み |
| LV-001〜LV-003 | livelyproperties.json 同梱済み |
| T-007〜T-009 Tier 2/3 フォールバック | スクリプト提供済み |

未決定事項 (UD-001〜UD-008) は `REQUIREMENTS.md` §11 を参照してください。

## ライセンス

MIT

## 関連リンク

- [要件定義 (REQUIREMENTS.md)](./REQUIREMENTS.md)
- [内部設計 (DESIGN.md)](./DESIGN.md) — 未承認ドラフト
- [Issue #1](https://github.com/hiragiyayoi/my-wallpaper/issues/1)
- [Issue #2](https://github.com/hiragiyayoi/my-wallpaper/issues/2)
- [PR #3](https://github.com/hiragiyayoi/my-wallpaper/pull/3)
