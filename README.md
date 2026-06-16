# ピットリンクプロ（PitLink Pro Fukui）

福井エリア向けの整備店向けダッシュボード（気象連動・顧客CRM・ダイナミックプライシング・予約連携）。

## ローカル開発

```bash
npm install
npm run dev          # http://localhost:8080

# オプション: Python API（LINE・メール・予約連携など）
npm run dev:backend  # http://localhost:8000
```

`.env.example` を `.env` にコピーし、必要なキーを設定してください。

## GitHub への保存

この PC に Git が未インストールの場合は、先に [Git for Windows](https://git-scm.com/download/win) をインストールしてください。

```bash
git init
git add .
git commit -m "Initial commit: PitLink Pro Fukui"
```

リポジトリ: [waka623/Pitlink-Pro](https://github.com/waka623/Pitlink-Pro)

```bash
git branch -M main
git remote add origin https://github.com/waka623/Pitlink-Pro.git
git push -u origin main
```

**注意:** `.env` は `.gitignore` 済みです。API キーを GitHub に上げないでください。

## Vercel への公開デプロイ

1. [Vercel](https://vercel.com) に GitHub アカウントでログイン
2. **Add New → Project** から上記リポジトリをインポート
3. 設定（通常は自動検出で OK）:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Install Command:** `npm install`
4. **Environment Variables** に以下を追加（Production / Preview 両方）:

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `WEATHER_API_KEY` | 推奨 | OpenWeatherMap API キー（サーバー専用） |
| `VITE_SUPABASE_URL` | 任意 | Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 任意 | Supabase 公開キー |
| `VITE_API_URL` | 任意 | 本番 Python API の URL（後述） |

5. **Deploy** をクリック

デプロイ完了後、`https://<プロジェクト名>.vercel.app` で一般公開できます。

### 本番で動く機能 / 別ホストが必要な機能

| 機能 | Vercel のみ | 備考 |
|------|-------------|------|
| ログイン・ダッシュボード UI | ○ | |
| 気象データ（福井周辺） | ○ | `WEATHER_API_KEY` を Vercel に設定 |
| 顧客 CRM・車両分析 | ○ | フロントエンド内のデモデータ |
| LINE 連携・メール送信・予約 API | △ | Python バックエンド（`backend/`）が必要 |

Python API を本番でも使う場合は [Railway](https://railway.app) や [Render](https://render.com) などに `backend/` をデプロイし、Vercel の環境変数 `VITE_API_URL` にその URL（例: `https://your-api.railway.app`）を設定してください。

## 技術スタック

- **フロント:** TanStack Start + React 19 + Tailwind CSS
- **API（ローカル）:** FastAPI（Python）— `backend/`
- **デプロイ:** Vercel（Nitro `vercel` preset）
