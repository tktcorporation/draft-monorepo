# カラオケ採点履歴 Scraper & Viewer

DAM TOMOから精密採点AIなどのカラオケ採点データを取得し、Webアプリで閲覧・検索・フィルタリングできるツールです。

## 機能

- **スクレイピング**: DAM TOMOサイトから採点履歴を自動取得
- **データ保存**: JSON形式でローカルに保存（曲名、歌手名、点数）
- **Webアプリ**: React + Tailwind CSS v4 + shadcn/uiで構築
- **検索機能**: 曲名・歌手名でリアルタイム検索
- **フィルタリング**: 点数による絞り込み（90点以上、85点以上など）
- **ソート機能**: 曲名、歌手名、点数でソート可能
- **統計表示**: 総曲数、平均点、最高点を表示

## セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成し、DAM TOMOのログイン情報を設定します：

```bash
cd apps/karaoke-scraper
cp .env.example .env
```

`.env`ファイルを編集：

```env
CLUB_DAM_ID=your_dam_tomo_id
CLUB_DAM_PASS=your_password
```

### 2. 依存関係のインストール

```bash
npm install
```

## 使い方

### データの取得（スクレイピング）

```bash
npm run scrape
```

このコマンドは以下を実行します：
1. DAM TOMOサイトにログイン
2. 採点履歴ページにアクセス
3. 精密採点AI（最新3機種）のデータを取得
4. `scores.json`に保存（点数降順でソート）

**注意**: 初回実行時はページ構造の確認が必要です。スクリプトのセレクターを実際のHTML構造に合わせて調整してください。

### Webアプリの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスします。

### 検索・フィルタリング

- **検索ボックス**: 曲名または歌手名で検索
- **点数フィルター**: ドロップダウンで最低点を選択
- **ソート**: テーブルヘッダーをクリックして昇順/降順切り替え

## 技術スタック

- **スクレイピング**: Puppeteer
- **フロントエンド**: React 18 + TypeScript
- **スタイリング**: Tailwind CSS v4 + shadcn/ui
- **ビルドツール**: Vite
- **実行環境**: tsx (TypeScript実行)

## ディレクトリ構造

```
apps/karaoke-scraper/
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── card.tsx       # shadcn/ui Card component
│   ├── lib/
│   │   └── utils.ts           # Tailwind merge utility
│   ├── App.tsx                # メインアプリケーション
│   ├── main.tsx               # Reactエントリーポイント
│   └── index.css              # Tailwind CSS設定
├── scraper.ts                 # スクレイピングスクリプト
├── scores.json                # 取得したデータ（自動生成）
├── .env                       # 環境変数（要作成）
├── .env.example               # 環境変数テンプレート
└── package.json
```

## トラブルシューティング

### データが取得できない

1. `.env`ファイルが正しく設定されているか確認
2. DAM TOMOのログイン情報が正しいか確認
3. `scraper.ts`のセレクターをページの実際のHTML構造に合わせて調整

### Webアプリにデータが表示されない

1. `npm run scrape`を実行して`scores.json`を生成
2. ブラウザの開発者ツールでネットワークエラーを確認
3. `public`ディレクトリに`scores.json`をコピーする必要がある場合があります

## 今後の改善案

- [ ] ログイン後のページ構造を自動検出
- [ ] より多くの採点機種に対応
- [ ] グラフ表示機能（点数の分布など）
- [ ] データベースへの保存
- [ ] 定期的な自動更新

## ライセンス

MIT
