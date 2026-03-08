# 設計書

## アーキテクチャ
- 構成: Node.js + Express + Vanilla JS
- データ取得: サーバ起動時に `music/` を走査し、CSVとJSONを統合してメモリ保持
- 画面: `public/` の静的ファイルで描画し、`/api/*` をFetchで利用
- GitHub Pages対応: APIが使えない環境では `data/meta.json` と `data/songs.json` をクライアントで参照するフォールバック方式

## ディレクトリ設計
- `src/config.js`: 環境変数と設定値
- `src/lib/csvLoader.js`: CSVの読み込みと正規化
- `src/lib/musicRepository.js`: 楽曲データ統合・検索・詳細取得
- `src/app.js`: Expressアプリ、API、静的配信、ミドルウェア
- `src/server.js`: サーバ起動エントリ
- `public/*`: UI実装
- `tests/*`: 自動テスト

## API設計
- `GET /api/meta`
  - 管理者メッセージ・問い合わせURL・件数サマリ
- `GET /api/songs?q=&level=&limit=`
  - 楽曲一覧検索
  - 返却: `totalMatched`, `count`, `items`
- `GET /api/songs/:level/:img`
  - 楽曲詳細
  - 返却: 一覧項目 + `radar`

## データモデル
- Song（内部）
  - `id`, `level`, `ver`, `genre`, `title`, `img`, `bpm`, `len`, `notes`
  - `radar` (`total_notes`, `total_chords`, `max_notes_calc`, `soflan`, `longpop`)
  - `hasRadarImage`

## セキュリティ設計
- `helmet` による主要ヘッダー設定
- `express-rate-limit` による過剰アクセス抑止
- APIパラメータ検証
  - `level`: 1..50
  - `img`: 英数字/`._-` のみ

## パフォーマンス設計
- 起動時キャッシュ
- 圧縮配信（`compression`）
- 画像静的配信キャッシュ（`/media`）
- クライアント検索入力のデバウンス

## GitHub Pages ビルド設計
- `npm run build:pages` で `dist/` を生成
- `public/` をコピー
- `music/` を `dist/media/` にコピー
- リポジトリ集約データを `dist/data/*.json` に書き出し
- `404.html` と `.nojekyll` を生成
