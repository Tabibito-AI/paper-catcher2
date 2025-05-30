# Paper Catcher

Paper Catcherは、学術論文を自動的に収集し、日本語で翻訳・要約して提供するモダンなウェブアプリケーションです。複数の学術データベースから論文を取得し、Google Gemini APIを使用して日本語翻訳を行い、GitHub Pagesで自動的に公開します。

## ✨ 主な機能

- **🔍 論文収集**: arXiv、Semantic Scholar、Springer、PubMedから論文を自動収集
- **🌐 AI翻訳**: Google Gemini APIによる高品質な日本語翻訳（タイトル・抄録）
- **📱 レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **🔄 自動更新**: GitHub Actionsによる毎日の自動論文収集・更新
- **📊 多様なソート機能**: 登録日付順、ジャーナル別、出版日別、アーカイブ表示
- **💡 詳細モーダル**: 論文の詳細情報をポップアップで表示
- **🔗 Twitter共有**: 論文をTwitterで簡単に共有
- **⚡ 高速表示**: 効率的なデータ構造とキャッシュによる高速レンダリング

## 🚀 クイックスタート

### 前提条件

- **Node.js** (v18以上推奨)
- **npm** または **yarn**
- **GitHub アカウント**
- **Google Cloud Platform アカウント** (Gemini API用)

### 📦 インストール手順

1. **リポジトリをクローン**
```bash
git clone https://github.com/tomoto0/paper-catcher.git
cd paper-catcher
```

2. **依存パッケージをインストール**
```bash
npm install
```

3. **環境変数を設定**

`.env`ファイルをプロジェクトのルートディレクトリに作成：

```env
# 必須: Gemini API（翻訳機能）
GEMINI_API_KEY=your_gemini_api_key_here

# 必須: 検索キーワード（.envファイルの設定が優先されます）
KEYWORD1=TRE
KEYWORD2=SDE

# オプション: 追加のAPI（より多くの論文を取得）
SPRINGER_API_KEY=your_springer_api_key
PUBMED_API_KEY=your_pubmed_api_key

# 未使用（将来の拡張用）
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

4. **ローカルで実行**
```bash
node app.mjs
```

5. **結果を確認**
```bash
open index.html
```

## 🌐 GitHub Pagesデプロイ

### 基本設定

1. **GitHub Pages有効化**
   - リポジトリの「Settings」→「Pages」
   - ソースを「GitHub Actions」に設定

2. **環境変数設定（2つの方法）**

   **方法1: GitHub Secrets（推奨）**
   - 「Settings」→「Secrets and variables」→「Actions」→「Environment secrets」
   - 環境を「github-pages」に設定
   - 以下のシークレットを追加：
   ```
   GEMINI_API_KEY=your_gemini_api_key
   KEYWORD1=TRE
   KEYWORD2=SDE
   SPRINGER_API_KEY=your_springer_api_key
   PUBMED_API_KEY=your_pubmed_api_key
   ```

   **方法2: .envファイル（フォールバック）**
   - リポジトリに`.env`ファイルをコミット
   - GitHub Secretsが利用できない場合の自動フォールバック

### 🔄 自動更新システム

**GitHub Actions**が以下を自動実行：

- **📅 スケジュール**: 毎日JST午前0時（UTC 15:00）
- **🔧 処理フロー**:
  1. Node.js環境セットアップ
  2. 依存関係インストール
  3. 論文収集・翻訳実行
  4. 変更をコミット・プッシュ
  5. GitHub Pagesにデプロイ

**手動実行**:
- 「Actions」タブ→「Deploy static content to Pages」→「Run workflow」

### 📚 論文蓄積システム

**データ永続化**:
- **増分更新**: 毎日新しい論文が既存データに追加
- **重複排除**: DOI・論文IDによる自動重複除去
- **データ保存**: `papers.json`ファイルに全論文データを蓄積

**蓄積例**:
```
Day 1: 20論文収集 → papers.json (20論文)
Day 2: 15論文収集 → papers.json (35論文、重複除く)
Day 3: 18論文収集 → papers.json (53論文、重複除く)
```

**結果**: 時間経過とともに豊富な論文データベースが自動構築

## ⚙️ カスタマイズ

### 🔍 検索キーワード変更

**優先順位**: `.env`ファイル > GitHub Secrets > デフォルト値

```env
# .envファイルで設定（最優先）
KEYWORD1=machine_learning
KEYWORD2=artificial_intelligence
```

### 🎨 フロントエンド カスタマイズ

**スタイル変更**:
- `styles.css`: デザイン・レイアウト
- `index.html`: 構造・コンテンツ

**機能追加**:
- `src/index.js`: フロントエンドロジック
- `webpack.config.cjs`: ビルド設定

## 📖 使用方法

### 論文閲覧

**基本操作**:
- 📄 最新論文が自動表示
- 🔍 検索・フィルタリング
- 📊 ソート機能:
  - 📅 登録日付順
  - 📚 ジャーナル別
  - ⏱ 出版日別
  - 📚 アーカイブ表示

### 詳細表示

**モーダルウィンドウ**で以下を表示:
- 📝 タイトル（英語・日本語）
- 👥 著者情報
- 📖 ジャーナル名
- 🔗 論文リンク
- 📄 抄録（英語・日本語）
- 🐦 Twitter共有ボタン

## 🏗️ アーキテクチャ

### バックエンド（Node.js）
```
app.mjs                 # メインアプリケーション
├── 論文収集クライアント
│   ├── ArxivClient
│   ├── SemanticScholarClient
│   ├── SpringerClient
│   └── PubMedClient
├── GeminiTranslator    # AI翻訳
├── WebScraper         # 抄録スクレイピング
└── PaperCatcher       # 統合管理
```

### フロントエンド
```
index.html             # メインHTML
styles.css             # スタイルシート
src/
├── index.js          # フロントエンドロジック
└── webScraper.js     # スクレイピング（バックアップ）
bundle.js             # Webpackバンドル
```

### インフラ
- **GitHub Actions**: 自動実行ワークフロー
- **GitHub Pages**: 静的サイトホスティング
- **環境変数管理**: Secrets + .envフォールバック

## 🔌 API統合

### 学術データベース
| API | 説明 | 認証 |
|-----|------|------|
| **arXiv** | プレプリント論文 | 不要 |
| **Semantic Scholar** | 学術論文検索 | 不要 |
| **Springer** | 出版社論文 | APIキー |
| **PubMed** | 医学論文 | APIキー |

### AI翻訳
- **Google Gemini API**: 高品質日本語翻訳
  - **使用モデル**: `gemini-2.5-flash-preview-05-20`
  - **機能**: 論文タイトル・抄録の英日翻訳
  - **特徴**: 最新の学術用語対応、思考機能搭載の高精度翻訳
  - **更新**: 2025年5月版、ナレッジカットオフ2025年1月
  - **注意**: プレビューモデルのため、より厳しいレート制限が適用されます

## 🔧 トラブルシューティング

### ❌ 論文が更新されない

**1. GitHub Actionsログ確認**
- 「Actions」タブ→実行履歴→エラーログ確認

**2. 環境変数確認**
```bash
# ローカルで確認
node -e "console.log(process.env.GEMINI_API_KEY ? 'OK' : 'NG')"
```

**3. 権限設定確認**
- 「Settings」→「Actions」→「General」
- 「Workflow permissions」→「Read and write permissions」

### ❌ デプロイ失敗

**1. GitHub Pages設定**
- 「Settings」→「Pages」→「GitHub Actions」

**2. OIDC認証エラー**
- 通常は自動修復されます
- 手動再実行で解決することが多いです

### ❌ 翻訳が動作しない

**1. Gemini API確認**
```bash
# APIキーテスト
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

**2. フォールバック確認**
- GitHub Secrets設定確認
- .envファイル存在確認

## 📊 技術スタック

### バックエンド
- **Node.js** (v18+)
- **Google Gemini API** (翻訳)
- **Multiple Academic APIs** (論文収集)

### フロントエンド
- **Vanilla JavaScript** (ES6+)
- **CSS3** (Flexbox, Grid)
- **Webpack** (バンドル)

### インフラ
- **GitHub Actions** (CI/CD)
- **GitHub Pages** (ホスティング)

## 🤝 コントリビューション

**Issue・PR歓迎！**
- 🐛 バグ報告
- 💡 機能提案
- 📝 ドキュメント改善
- 🔧 コード改善

## 📄 ライセンス

**MIT License** - 詳細は[LICENSE](LICENSE)参照

## 🙏 謝辞

**依存ライブラリ・API**:
- Node.js, Webpack
- arXiv, Semantic Scholar, Springer, PubMed APIs
- Google Gemini API

## 📞 サポート

**質問・提案**: [GitHub Issues](https://github.com/tomoto0/paper-catcher/issues)

---

**🚀 Happy Paper Hunting!**
