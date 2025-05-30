# Paper Catcher

Paper Catcherは、論文を自動的に収集し、日本語で要約・翻訳して提供するウェブアプリケーションです。ユーザーが設定したキーワードに関連する論文を各種APIで取得し、Gemini APIを使用して日本語訳を作成し、GitHubページに自動的に更新します。

## 機能

- **自動論文収集**: 設定したキーワードに基づいて論文を自動的に収集
- **日本語翻訳**: 論文のタイトルと要約を日本語に翻訳
- **カテゴリ分類**: （例）「教育・労働経済学」と「経済学一般」のカテゴリに分類
- **多様なソート機能**: 登録日付順、取得順、ジャーナル別、出版日別でソート可能
- **アーカイブ機能**: 過去の論文をアーカイブとして閲覧可能
- **モバイル対応**: レスポンシブデザインによりスマートフォンやタブレットでも快適に閲覧可能

## セットアップ方法

### 前提条件

- Node.js (v14以上)
- npm または yarn
- GitHub アカウント
- Google Cloud Platform アカウント (Gemini APIのため)

### インストール手順

1. リポジトリをクローンします

```bash
git clone https://github.com/yourusername/paper-catcher.git
cd paper-catcher
```

2. 依存パッケージをインストールします

```bash
npm install
```

3. 環境変数を設定します

`.env`ファイルをプロジェクトのルートディレクトリに作成し、以下の内容を追加します：

```
GEMINI_API_KEY=your_gemini_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
KEYWORD1=your_primary_keyword
KEYWORD2=your_secondary_keyword
SPRINGER_API_KEY=your_springer_api_key
PUBMED_API_KEY=your_pubmed_api_key
```

4. アプリケーションを実行して論文を収集・翻訳します

```bash
node app.mjs
```

5. 生成されたHTMLファイルをブラウザで開いて確認します

```bash
open index.html
```

### GitHub Pagesへのデプロイ

1. リポジトリの「Settings」タブから「Pages」を選択します
2. ソースとして「GitHub Actions」を選択します
3. GitHub Actionsのワークフロー（`.github/workflows/static.yml`）が自動的に論文を収集し、GitHubページにデプロイします

## 自動更新の設定

このアプリケーションは、GitHub Actionsを使用して毎日自動的に論文を収集し、ウェブページを更新します。

### GitHub Actionsの設定

1. リポジトリの「Settings」タブから「Secrets and variables」→「Actions」を選択します
2. 以下のシークレットを追加します：
   - `GEMINI_API_KEY`: Gemini APIのキー
   - `AWS_ACCESS_KEY_ID`: AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: AWS Secret Access Key
   - `AWS_REGION`: AWSリージョン
   - `KEYWORD1`: 主要検索キーワード（例: machinelearning）
   - `KEYWORD2`: 副次的検索キーワード（オプション）
   - `SPRINGER_API_KEY`: Springer APIのキー（オプション）
   - `PUBMED_API_KEY`: PubMed APIのキー（オプション）

3. `.env`ファイルをリポジトリのルートディレクトリに作成し、上記と同じ環境変数を設定します。GitHub Actionsはこの`.env`ファイルを使用して論文収集と翻訳を行います。

4. GitHub Actionsのワークフロー（`.github/workflows/static.yml`）は以下の処理を自動実行します：
   - 設定したスケジュール（デフォルトでは毎日JST午前0時）に実行
   - Node.js環境のセットアップ
   - 依存パッケージのインストール
   - 論文の収集と翻訳処理（app.mjsの実行）
   - 変更内容のコミットとプッシュ
   - GitHub Pagesへのデプロイ（最新のコミットを確実に取得して反映）
     - デプロイジョブでは `git pull --ff-only` を実行して最新の変更を確実に取得

5. ワークフローは手動でも実行できます：
   - リポジトリの「Actions」タブを選択
   - 「Deploy static content to Pages」ワークフローを選択
   - 「Run workflow」ボタンをクリック

## カスタマイズ方法

### 収集するキーワードの変更

`.env`ファイルの`KEYWORD1`と`KEYWORD2`を編集します：

```
KEYWORD1=machinelearning
KEYWORD2=artificialintelligence
```

または、`app.mjs`ファイル内の`getKeywordsQuery`関数を直接編集することもできます：

```javascript
function getKeywordsQuery() {
    const keyword1 = process.env.KEYWORD1 || 'machinelearning';
    const keyword2 = process.env.KEYWORD2 || '';
    
    if (keyword2) {
        return `"${keyword1}" OR "${keyword2}"`;
    }
    return `"${keyword1}"`;
}
```

### カテゴリの追加・変更

1. `app.mjs`ファイル内の`keywords`配列でカテゴリを定義します
2. `index.html`ファイル内の`.filter-buttons`セクションにカテゴリボタンを追加します：

```html
<div class="filter-buttons">
  <button class="filter-btn active">教育・労働経済学</button>
  <button class="filter-btn">経済学一般</button>
  <button class="filter-btn">新しいカテゴリ</button>
</div>
```

## 使用方法

### 論文の閲覧

1. ウェブページにアクセスすると、最新の論文が表示されます
2. 上部のフィルターボタンでカテゴリを選択できます
3. ソートボタンで表示順を変更できます：
   - 📅 登録日付順: 論文がシステムに登録された日付順
   - ≡ 取得順: 論文が取得された順番
   - 📚 ジャーナル別: ジャーナル名のアルファベット順
   - ⏱ 出版日別: 論文の出版日順
   - 📚 アーカイブ: すべての論文を表示

### 論文の詳細表示

論文カードの「詳細」ボタンをクリックすると、モーダルウィンドウで論文の詳細情報が表示されます：
- 論文タイトル（英語と日本語）
- 著者情報
- ジャーナル名
- 論文へのリンク（利用可能な場合）
- 要約（英語と日本語）

## アーキテクチャ

Paper Catcherは以下のコンポーネントで構成されています：

1. **バックエンド（Node.js）**:
   - `app.mjs`: メインのアプリケーションロジック、論文収集と翻訳処理
   - `webScraper.js`: 論文情報のスクレイピング（ルートディレクトリに配置）
   - `src/webScraper.js`: 同じスクレイピングロジックのコピー（src内に配置）

2. **フロントエンド（HTML/CSS/JavaScript）**:
   - `index.html`: メインのHTMLファイル
   - `styles.css`: スタイルシート
   - `bundle.js`: フロントエンドのJavaScriptロジック（Webpackでバンドル）

3. **ビルドツール**:
   - Webpack: JavaScriptのバンドル（webpack.config.cjs）

4. **デプロイ**:
   - GitHub Pages: 静的ウェブサイトのホスティング
   - GitHub Actions: 自動更新ワークフロー（.github/workflows/static.yml）

## API統合

このアプリケーションは以下のAPIを使用しています：

1. **学術論文API**:
   - arXiv API
   - Semantic Scholar API
   - Springer API（APIキーが必要）
   - PubMed API（APIキーが必要）

2. **翻訳API**:
   - Google Gemini API: 論文タイトルと要約の翻訳

## トラブルシューティング

### 論文が更新されない場合

1. GitHub Actionsのログを確認して、エラーがないか確認します
   - リポジトリの「Actions」タブからワークフロー実行履歴を確認
   - エラーメッセージがあれば、それに基づいて対処

2. 環境変数が正しく設定されているか確認します
   - `.env`ファイルが正しく作成されているか確認
   - 特にGEMINI_API_KEYが有効であることを確認
   - キーワード設定が適切か確認

3. ワークフローの実行権限を確認します
   - リポジトリの「Settings」→「Actions」→「General」で権限設定を確認
   - 「Workflow permissions」が「Read and write permissions」に設定されていることを確認

### デプロイに失敗する場合

1. GitHub Pagesが有効になっているか確認します
   - リポジトリの「Settings」→「Pages」で確認
   - ソースが「GitHub Actions」に設定されていることを確認

2. GitHub Actionsの権限が正しく設定されているか確認します
   - リポジトリの「Settings」→「Actions」→「General」で確認
   - 「Workflow permissions」が「Read and write permissions」に設定されていることを確認

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 貢献

バグ報告や機能リクエストは、GitHubのIssueで受け付けています。プルリクエストも歓迎します。

## 謝辞

このプロジェクトは、以下のオープンソースライブラリとAPIに依存しています：

- Node.js
- Webpack
- arXiv API
- Semantic Scholar API
- Springer API
- PubMed API
- Google Gemini API

## 連絡先

質問や提案がある場合は、GitHubのIssueを作成してください。
