# AI家庭教師 (AI Tutor)

中高生向けのAI家庭教師Webアプリケーション。Google Gemini APIを使用して、学習計画の作成、質問への回答、進捗管理をサポートします。

## 主な機能

- 💬 **AIチャット**: Gemini 2.5 Flash による学習サポート
- 📚 **学習計画管理**: AI生成プランの保存と進捗追跡
- 📝 **メモ機能**: クイックメモの作成・管理
- 📱 **モバイル連携**: QRコード経由での画像アップロード
- 🎤 **音声入力**: ブラウザ標準の音声認識機能

## 技術スタック

- **Frontend**: Next.js 15 (App Router), React, TailwindCSS
- **Backend**: FastAPI, SQLAlchemy, SQLite
- **AI**: Google Gemini 2.5 Flash API

## セットアップ

### 前提条件
- Node.js 18+
- Python 3.10+
- Google Cloud Project & Gemini API Key

### 1. バックエンド

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# .env ファイルを作成
# GEMINI_API_KEY=your_api_key_here

uvicorn main:app --reload --port 8000
```

### 2. フロントエンド

```powershell
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:9000` にアクセス

## プロジェクト構成

```
AI-tutor/
├── backend/           # FastAPI バックエンド
│   ├── app/
│   │   ├── routers/  # API エンドポイント
│   │   ├── models.py # データベースモデル
│   │   └── schemas.py # Pydantic スキーマ
│   ├── main.py
│   └── requirements.txt
├── frontend/          # Next.js フロントエンド
│   ├── app/          # App Router ページ
│   ├── components/   # React コンポーネント
│   └── lib/          # API クライアント
└── docs/             # ドキュメント
```

## 使い方

1. **学習計画の作成**
   - AIに「〜の学習計画を作って」と依頼
   - 「📅 この内容で計画を作成」ボタンで保存

2. **進捗管理**
   - 計画詳細ページでタスクをチェック
   - 進捗率が自動更新

3. **メモ機能**
   - 右下の黄色ペンアイコンをクリック
   - クイックメモを作成・管理

## ライセンス

MIT License

## 作成者

AI Assistant (Antigravity)
