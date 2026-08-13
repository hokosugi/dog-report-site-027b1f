# 愛犬記録レポートサイト（GitHub Pages）

iPhoneショートカット → Googleスプレッドシート（台帳）に貯めた愛犬の記録を、
静的サイトとして家族向けに表示・公開するための一式です。**農作業レポートサイト**
（`hokosugi/farm-report-site`）と同じ構成を踏襲しています。

- 記録：ショートカットの音声・写真入力がClaudeでJSON化され、台帳「記録」タブに1行=1レコードで溜まる
- 変換：`convert.py` が台帳（CSV）を読み、`status=confirmed` の行だけをサイト表示用の `data/reports.json` に変換
- 表示：6カテゴリ（食事／排泄／散歩／体調・健康／しつけ・行動／遊び・その他）ごとに項目を表で表示し、写真 or 動画（1件につき1つ）を下に表示
- ホスティング：GitHub Pages（無料・静的）

---

## データの流れ

```
iPhoneショートカット（家族各自）
      │ 音声・写真 → Claude → raw_json をGASにPOST
      ▼
Googleスプレッドシート「愛犬記録台帳」  ← A〜J列（10列）
      │ 「記録」タブをウェブに公開 → CSV URL取得
      ▼
data/ledger.csv  ─ python convert.py ─▶  data/reports.json
                                              │
                                              ▼
                                  index.html / js/app.js が描画
```

台帳が主データ、`reports.json` は生成物です。手で編集しません。

---

## ローカルで確認する

```bash
cd dog-report-site
python3 scripts/convert.py                 # data/ledger.csv → data/reports.json（自分のCSVがまだ無ければ同梱のサンプルJSONで確認可）
python3 -m http.server 8000 --directory .
# ブラウザで http://localhost:8000 を開く
```

`file://` で直接開くと `fetch` がブロックされるため、必ずローカルサーバー経由で開いてください。
同梱の `data/reports.json` はサンプル3件（散歩・食事・体調）なので、そのまま `python3 -m http.server` だけでも表示イメージを確認できます。

---

## GitHubリポジトリの作成とPages公開（初回セットアップ）

ここはあなたのGitHubアカウントで行う作業なので、この会話からは実行できません。以下をMac（またはこのリポジトリを使う端末）のターミナルで行ってください。**Privateのままだと無料プランではPagesが公開できない**ため、farm-report-siteと同じく「公開リポジトリ＋推測困難なURL」方式を推奨します（本格的にアクセス制限したい場合はCloudflare Pages + Access等に将来切替可）。

### 1. リポジトリを作成

GitHub CLIがあれば：
```bash
gh repo create <owner>/dog-report-site --public --description "愛犬記録レポート（家族限定URL共有）"
```
Web UIでもOK（github.com → New repository → Public）。

### 2. ローカルにこの一式を配置してpush

このワークスペースの `data/dog-report-site/` には、サイト表示用ファイル一式に加えて `scripts/`（convert.py・sync_prompt.py・publish_site.py）と `gas/`（Code.gs）が入っています。**Mac側では次のように配置してください**：

```
dog-report-site/                  ← このリポジトリのルート
├─ index.html                     ← ここに配置（.gitignore対象外＝push対象）
├─ css/ js/ data/                 ← 同上
├─ .github/workflows/deploy.yml
├─ .nojekyll  .gitignore  README.md
├─ convert.py                     ← scripts/convert.py をここに移動（.gitignore対象＝push対象外）
├─ sync_prompt.py                 ← scripts/sync_prompt.py をここに移動（同上）
└─ publish_site.py                ← scripts/publish_site.py をここに移動（同上）
```

`gas/Code.gs` はこのリポジトリには含めません。Google Apps Scriptのエディタに直接貼り付けてデプロイするものなので、git管理の対象外です。

```bash
cd dog-report-site
git init
git remote add origin https://github.com/<owner>/dog-report-site.git
git add index.html css js data/reports.json .github .nojekyll .gitignore README.md
git commit -m "初期セットアップ"
git branch -M main
git push -u origin main
```

（`convert.py` 等は `.gitignore` に載っているので `git add` しても無視されます＝意図した動作です）

### 3. GitHub Pagesを有効化

GitHubの当該リポジトリ → Settings → Pages → **Source: GitHub Actions** を選択。
すでに `.github/workflows/deploy.yml` が入っているので、pushするだけで自動的にビルド・公開されます。数分後に `https://<owner>.github.io/dog-report-site/` で見られるようになります。

### 4. URLを家族に共有

公開リポジトリなのでURLを知っていれば誰でも見られます。したがって：
- リポジトリ名を推測困難な文字列（例：`dog-report-site-x7f2q`）にする
- 発行されたURLはLINE等で家族にだけ直接共有する

の2点を徹底してください（`hokosugi/farm-report-site` と同じ運用）。

---

## 継続的な更新（自動化）

`scripts/publish_site.py`（Mac側、リポジトリルートに配置後）が以下を自動で行います。launchdで12時間ごとに実行する想定（`dog-report-site-python-scripts` のドラフトを参照）：

1. 台帳CSVを取得（ウェブに公開したURL）
2. `convert.py` で `data/reports.json` を再生成
3. 変更があれば `git add` → `commit` → `push`
4. pushをトリガーに GitHub Actions が自動デプロイ

急ぎで反映したいときは手動で `python3 publish_site.py` を実行してください。

`scripts/sync_prompt.py` は台帳「プロンプト」タブ → 家族共有iCloudの `system_prompt.txt` を24時間ごとに同期します（このサイトのpushとは独立した処理です）。

---

## 画像・動画について

台帳の `photo_url`（J列）はGoogle Driveの共有リンクです。写真は
`https://drive.google.com/thumbnail?id=<ID>&sz=w2000` に、動画は
`https://drive.google.com/file/d/<ID>/preview`（iframe埋め込み）に `convert.py` が自動変換します。
**対象ファイルが「リンクを知っている全員が閲覧可」で共有されている必要があります**。
非公開のままだと「表示できません」のフォールバック表示になります。

Drive上のメディアはサイト側の容量を消費しません（GitHubには載せません）。

---

## ディレクトリ構成（このワークスペース内）

```
data/dog-report-site/
├─ index.html / css/style.css / js/app.js   # サイト表示（このまま配置してpush）
├─ .github/workflows/deploy.yml             # Pages自動デプロイ
├─ .nojekyll / .gitignore / README.md
├─ data/reports.json                        # サンプルデータ（本番はconvert.pyが上書き生成）
├─ scripts/                                 # convert.py / sync_prompt.py / publish_site.py
│                                            # → 実運用ではリポジトリのルートに移動して配置
└─ gas/Code.gs                              # Apps Scriptエディタに貼るコード（git管理外）
```
