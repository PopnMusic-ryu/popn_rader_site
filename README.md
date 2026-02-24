# pop'n music Radar Viewer

`music/` ディレクトリ上の CSV / JSON / 画像を読み取り、楽曲一覧・検索・詳細ポップアップ表示を行うWebアプリです。

## セットアップ

```bash
npm install
npm start
```

起動後: `http://localhost:3000`

## 主な機能
- 楽曲一覧表示
- キーワード検索 + レベル絞り込み
- 詳細ポップアップ（譜面レーダー画像・楽曲情報・レーダー値）
- 管理者メッセージ・お問い合わせリンク表示

## ディレクトリ

```text
music/
  49/
    49.csv
    toy_contemporary_ex_/
      radar.png
      detected_results.json
src/
public/
tests/
docs/
```

## 環境変数
- `PORT` (default: `3000`)
- `MUSIC_ROOT` (default: `<project>/music`)
- `ADMIN_MESSAGE` (default: 定型文)
- `CONTACT_FORM_URL` (default: `https://forms.gle/example`)
- `SEARCH_LIMIT_DEFAULT` (default: `120`)
- `SEARCH_LIMIT_MAX` (default: `500`)

## テスト

```bash
npm test
```

## 補足
- `music/` 配下は `IMG` 列の値をフォルダ名として参照します。
- レーダー画像が無い楽曲は、詳細画面で画像無し表示になります。
