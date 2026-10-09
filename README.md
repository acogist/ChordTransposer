# Chord Transposer

A web app that transposes chord charts. Paste a chord chart or open a text, PDF, or image file, choose the key shift, and save the result.

コード譜を転調する Web アプリです。コード譜を貼り付けるか、テキスト・PDF・画像ファイルを開き、転調幅を選ぶだけで変換できます。

**▶ https://ktkwmr.com/chordtransposer/**

## Features / 機能

- **Transpose** chords up or down by semitones, with `#` / `b` notation switching
  半音単位の転調と、`#` / `b` 表記の切り替え
- **Open files**: text, text-based PDFs, and images or scanned PDFs (OCR, Japanese and English)
  テキスト、PDF、画像・スキャン PDF（OCR、日本語・英語）の読み込み
- **Preview and save** the transposed chart
  変換結果のプレビューと保存
- **Installable PWA** that also works offline after the first visit
  ホーム画面に追加でき、一度開けばオフラインでも動作

## Privacy / プライバシー

Files you open and text you enter are processed only in your browser and are never uploaded to a server. When you open a PDF or an image, the PDF.js and Tesseract.js libraries and the OCR language data are downloaded from the jsDelivr CDN.

開いたファイルや入力した内容はブラウザ内だけで処理され、サーバーには送信されません。PDF や画像を開いたときのみ、PDF.js・Tesseract.js と OCR 用の言語データを jsDelivr CDN から読み込みます。

## Project structure / 構成

```
public/
  _redirects                    # / → /chordtransposer/
  robots.txt
  chordtransposer/
    index.html                  # the whole app (HTML / CSS / JS)
    sw.js                       # Service Worker (network first, offline fallback)
    manifest.json               # PWA manifest
    icons/
    THIRD_PARTY_LICENSES.md     # third-party notices (shown in About)
scripts/
  update-third-party-licenses.mjs
wrangler.jsonc                  # Cloudflare Workers (static assets)
```

There is no build step. The files in `public/` are served as they are.
ビルド工程はなく、`public/` のファイルをそのまま配信します。

## Development / 開発

Serve `public/` with any static server and open `/chordtransposer/`.

```sh
npx wrangler dev        # http://localhost:8787/chordtransposer/
# or
npx serve public
```

## Deploy / デプロイ

The app is served with Cloudflare Workers static assets.

```sh
npx wrangler deploy
```

## Third-party licenses / サードパーティライセンス

Libraries loaded from a CDN are listed in [`public/chordtransposer/THIRD_PARTY_LICENSES.md`](public/chordtransposer/THIRD_PARTY_LICENSES.md), which is also shown in the app's About dialog.

When a new CDN library (`cdn.jsdelivr.net/npm/…` or `unpkg.com/…`) is added under `public/`, the **Update third-party licenses** GitHub Actions workflow adds its entry and license text to the file automatically on push to `main`. You can also run it locally:

```sh
node scripts/update-third-party-licenses.mjs          # add missing libraries
node scripts/update-third-party-licenses.mjs --check  # exit 1 if something is missing
```

`public/` 配下に CDN のライブラリを追加して `main` に push すると、GitHub Actions が自動で THIRD_PARTY_LICENSES.md に追記します。ライブラリを削除したときは警告のみ出るので、該当項目を手で削除してください。

## License / ライセンス

[MIT License](LICENSE) © 2026 ktkwmr
