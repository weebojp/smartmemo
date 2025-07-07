# SmartMemo 最終仕様書

## 1. プロダクト定義

### ビジョン
「AIが自動的に知識をつなぐ、あなたの第二の脳」

### ターゲットユーザー
- 研究者・学習者
- ナレッジワーカー
- ライター・クリエイター

## 2. 技術スタック（確定）

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + React Query
- **Graph**: Cytoscape.js
- **PWA**: next-pwa

### Backend
- **API**: Next.js API Routes + tRPC
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Queue**: BullMQ (Redis via Upstash)

### AI
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small
- **Future**: Ollama integration (local option)

## 3. データモデル

```typescript
// Database Schema
interface Memo {
  id: string;
  userId: string;
  content: string;
  contentMarkdown: string;
  embedding: number[]; // pgvector
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    source: 'manual' | 'web' | 'api';
    sourceUrl?: string;
    sourceTitle?: string;
  };
  
  ai: {
    tags: string[];
    category: string;
    summary: string;
    keywords: string[];
    processedAt: Date;
  };
  
  stats: {
    viewCount: number;
    relatedClickCount: number;
  };
}

interface MemoRelation {
  id: string;
  memoId: string;
  relatedMemoId: string;
  type: 'semantic' | 'reference' | 'temporal';
  strength: number; // 0-1
  createdAt: Date;
}
```

## 4. MVP機能（Phase 0: 2週間）

### Week 1
1. **基本CRUD**
   - メモの作成・編集・削除
   - マークダウンサポート
   - リアルタイム保存

2. **AI処理（非同期）**
   - タグ自動生成
   - カテゴリー分類
   - キーワード抽出

### Week 2
3. **関連メモ表示**
   - 意味的類似度による関連メモ
   - サイドバーでの関連表示
   - 関連度スコア表示

4. **基本検索**
   - 全文検索
   - タグフィルター
   - セマンティック検索（ベータ）

## 5. ディレクトリ構造

```
smartmemo/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (app)/
│   │   ├── memos/
│   │   ├── graph/
│   │   └── settings/
│   ├── api/
│   │   ├── trpc/
│   │   └── webhooks/
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── memo/
│   └── graph/
├── lib/
│   ├── ai/
│   ├── db/
│   └── utils/
├── hooks/
├── store/
└── types/
```

## 6. 開発タイムライン

### Phase 0 (MVP) - 2週間
- Week 1: 基本機能 + AI統合
- Week 2: 関連機能 + 検索

### Phase 1 (拡張) - 4週間
- Week 3-4: グラフビュー実装
- Week 5-6: ブラウザ拡張 + PWA

### Phase 2 (成長) - 4週間
- Week 7-8: 共有機能 + コラボレーション
- Week 9-10: モバイルアプリ

## 7. 成功指標

### 技術指標
- API レスポンス: < 200ms
- AI処理完了: < 5秒
- 関連性計算: < 1秒

### ビジネス指標
- 初回体験完了率: > 80%
- 7日間リテンション: > 40%
- 関連メモクリック率: > 30%