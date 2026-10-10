# Chord Transposer

A web app that transposes chord charts. Paste a chord chart or open a text, PDF, or image file, choose the key shift, and save the result.

コード譜を転調する Web アプリです。コード譜を貼り付けるか、テキスト・PDF・画像ファイルを開き、転調幅を選ぶだけで変換できます。

**▶ https://ktkwmr.com/chordtransposer/** (日本語: https://ktkwmr.com/chordtransposer/ja/)

## Features / 機能

- **Transpose** chords up or down by semitones, with `#` / `b` notation switching
  半音単位の転調と、`#` / `b` 表記の切り替え
- **Open files**: text, text-based PDFs, and images or scanned PDFs (OCR, Japanese and English)
  テキスト、PDF、画像・スキャン PDF（OCR、日本語・英語）の読み込み
- **Preview and save** the transposed chart
  変換結果のプレビューと保存
- **Installable PWA** that also works offline after the first visit
  ホーム画面に追加でき、一度開けばオフラインでも動作
- **English / Japanese UI**, chosen automatically from your browser language. `/chordtransposer/ja/` is always Japanese, and `?lang=en` / `?lang=ja` overrides both
  英語・日本語の表示に対応。ブラウザの言語で自動選択。`/chordtransposer/ja/` は常に日本語で、`?lang=en` / `?lang=ja` で切り替えも可能

## Privacy / プライバシー

- Files you open and text you enter are processed only in your browser and are never uploaded to a server. The app has no accounts, cookies, ads, or analytics.
- When you open a PDF or an image, PDF.js, Tesseract.js, and the OCR language data are downloaded from the jsDelivr CDN. jsDelivr receives your IP address and browser information, but not your file.
- For offline use, the app and the OCR language data are saved in your browser's storage. Clear this site's data to remove them.
- The site is hosted on Cloudflare, which keeps standard access logs (IP address, time, requested page) for operation and security.

- 開いたファイルや入力した内容はブラウザ内だけで処理され、サーバーには送信されません。アカウント登録・Cookie・広告・アクセス解析はありません。
- PDF や画像を開いたときのみ、PDF.js・Tesseract.js と OCR 用の言語データを jsDelivr CDN から読み込みます。jsDelivr には IP アドレスやブラウザ情報が送られますが、ファイルの内容は送られません。
- オフラインで使えるよう、アプリ本体と OCR 用データをブラウザ内に保存します。サイトデータを削除すると消えます。
- サイトは Cloudflare で配信しており、運用・セキュリティのために標準的なアクセスログ（IP アドレス、日時、アクセスしたページ）が記録されます。

The same notice is shown in the app under ⚙ → **Privacy**.
アプリ内の ⚙ → **プライバシー** でも同じ内容を表示しています。

## Project structure / 構成

```
public/
  _redirects                    # / → /chordtransposer/
  _headers                      # security headers (CSP etc.)
  404.html                      # page for unknown URLs (status 404)
  robots.txt
  sitemap.xml
  chordtransposer/
    index.html                  # the whole app (HTML / CSS / JS, English and Japanese text)
    ja/index.html               # Japanese page, generated from index.html (do not edit)
    sw.js                       # Service Worker (network first, offline fallback)
    manifest.json               # PWA manifest
    icons/
    og-image.png                # image for search results and social media shares
    THIRD_PARTY_LICENSES.md     # third-party notices (shown in About)
scripts/
  build-ja.mjs                  # generates ja/index.html from index.html
  update-third-party-licenses.mjs
  og-image.html                 # source of og-image.png
  render-og-image.mjs           # renders og-image.html to og-image.png (Playwright)
wrangler.jsonc                  # Cloudflare Workers (static assets)
```

The files in `public/` are served as they are. The only generated file is `public/chordtransposer/ja/index.html` (see below).
`public/` のファイルをそのまま配信します。生成されるファイルは `public/chordtransposer/ja/index.html` だけです（下記参照）。

When you load a script, worker, or data from a new external host, add it to the `Content-Security-Policy` in `public/_headers`, or the browser will block it.
新しい外部サイトからスクリプトやデータを読み込むときは、`public/_headers` の `Content-Security-Policy` にそのホストを追加してください（追加しないとブラウザにブロックされます）。

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

## Japanese page / 日本語ページ

`public/chordtransposer/ja/index.html` is a copy of `index.html` with Japanese `<head>` (title, description, canonical, Open Graph, JSON-LD) and Japanese UI text, so search engines can index the Japanese version. Edit only `index.html`; the Japanese page is regenerated:

- automatically by `npx wrangler deploy` / `npx wrangler dev` (`build.command` in `wrangler.jsonc`)
- automatically by the **Build Japanese page** GitHub Actions workflow on push to `main`
- manually:

```sh
node scripts/build-ja.mjs          # regenerate ja/index.html
node scripts/build-ja.mjs --check  # exit 1 if ja/index.html is out of date
```

The Japanese title and description for search results are in `scripts/build-ja.mjs`. UI text comes from the `I18N.ja` strings in `index.html`.

検索エンジンが日本語版をインデックスできるよう、`ja/index.html` は `index.html` の `<head>`（タイトル・説明文・canonical・OGP・JSON-LD）と画面の文言を日本語に置き換えたものです。編集するのは `index.html` だけで、日本語ページはデプロイ時（`wrangler deploy` / `wrangler dev`）と `main` への push 時（GitHub Actions）に自動で再生成されます。検索結果に出る日本語のタイトルと説明文は `scripts/build-ja.mjs` にあります。

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
