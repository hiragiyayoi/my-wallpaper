# DJ Turntable Live Wallpaper

クロスプラットフォームで動作するライブ壁紙アプリケーション。
DJ ターンテーブルをモチーフとした UI で、背景画像・動画再生・時計表示を提供します。

## 特徴

- **背景画像選択**: 任意の JPEG / PNG / WebP / GIF を背景に設定（IndexedDB に永続化）
- **動画再生 + ターンテーブル UI**: HTML5 video を DJ ターンテーブル（レコード回転）メタファーで表示
  - 動画タイトル・制作者名（チャンネル名）表示
  - 再生 / 一時停止 / 音量 / シーク操作
- **時計表示**: OS システム時計をリアルタイム表示（12/24 時間切替、日付・曜日）
- **クロスプラットフォーム**: Windows (Wallpaper Engine / Lively) / Linux (swww / mpvpaper) / macOS (Plash)
- **パフォーマンス**: FPS 制御、省電力モード対応

## 技術スタック

| レイヤー | 技術 |
|---|---|
| 言語 | TypeScript |
| ビルド | Vite |
| 描画 | CSS3 Animation + Canvas API |
| 動画再生 | HTML5 `<video>` |
| 時計 | JavaScript `Date` / `Intl.DateTimeFormat` |
| ストレージ | IndexedDB / localStorage |
| 開発環境 | Nix (home-manager) |

## 開発環境セットアップ

### Nix を使用する場合

```bash
# Nix daemon を有効化
. /nix/var/nix/profiles/default/etc/profile.d/nix.sh

# home-manager を適用（初回のみ）
cd ~/nix-config && nix flake check && home-manager switch --flake .#user
```

### Node.js / pnpm

```bash
# pnpm で依存関係をインストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# テスト
pnpm test
```

## プロジェクト構成

```
my-wallpaper/
├── REQUIREMENTS.md      # 要件定義書
├── README.md            # 本ファイル
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts
│   ├── components/
│   │   ├── BackgroundImage.ts
│   │   ├── Turntable.ts
│   │   └── Clock.ts
│   ├── storage/
│   │   └── IndexedDB.ts
│   └── styles/
│       └── theme.css
└── dist/                # ビルド成果物
```

## ライブ壁紙としての使用

### Windows (Wallpaper Engine)
1. `dist/` を Wallpaper Engine プロジェクトフォルダに配置
2. `project.json` を編集
3. Wallpaper Engine エディタでプレビュー

### Windows (Lively Wallpaper)
1. `dist/` フォルダを Lively にドラッグ&ドロップ

### Linux
```bash
# swww (静止画)
swww img dist/preview.png

# mpvpaper (動画)
mpvpaper -o "loop" '*' dist/output.webm
```

### macOS (Plash)
Plash で `index.html` の URL を指定

## ライセンス

MIT

## 関連リンク

- [要件定義 (Issue #1)](https://github.com/hiragiyayoi/my-wallpaper/issues/1)
- [実装計画 (Issue #2)](https://github.com/hiragiyayoi/my-wallpaper/issues/2)
