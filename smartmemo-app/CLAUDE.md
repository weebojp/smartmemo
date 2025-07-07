# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key

### Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Setup
Run the SQL schema in `supabase/schema.sql` in your Supabase project to create the required tables with pgvector extension.

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components built on Radix UI, Cytoscape.js for graph visualization
- **Backend**: Server Actions (no API routes), Supabase as BaaS
- **Database**: Supabase PostgreSQL + pgvector for vector embeddings
- **AI**: OpenAI GPT-4o-mini + text-embedding-3-small
- **State**: React Query for server state, Zustand for client state

### Authentication & Security
- **Supabase Auth** with cookie-based sessions managed via middleware
- **Row Level Security (RLS)** ensures user data isolation
- **Server/client separation**: `lib/supabase/server.ts` vs `lib/supabase/client.ts`
- **Protected routes** handled by middleware with proper redirects

### Core Features Implemented

**AI-Powered Knowledge Management**:
- Automatic content analysis with tag generation, categorization, and summarization
- Vector embeddings for semantic similarity and search
- Related memo discovery based on semantic relationships

**Multi-Modal Search System**:
- **Semantic Search**: Uses vector embeddings for meaning-based search
- **Text Search**: Traditional keyword-based search across all fields
- **Hybrid Search**: Combines both approaches with weighted ranking (70% semantic, 30% text)

**Interactive Knowledge Graph**:
- Cytoscape.js-powered visualization of memo relationships
- Category-based color coding and similarity-based edge weights
- Expandable full-screen view with interactive node selection

**Analytics & Statistics**:
- Comprehensive dashboard with memo counts, AI processing status
- Tag popularity rankings and engagement metrics
- Knowledge graph connectivity statistics

### Data Architecture
The app centers around the `memos` table with AI-enhanced metadata:
```typescript
interface Memo {
  // Core content
  content: string              // Raw text for editing
  content_markdown: string     // Processed markdown for display
  embedding: number[]          // 1536-dim vector for similarity search
  
  // AI-generated metadata
  tags: string[]              // Auto-extracted tags
  category: string            // AI-assigned category  
  summary: string             // AI-generated summary
  keywords: string[]          // Key terms for search
  
  // Analytics
  view_count: number          // Memo views
  related_click_count: number // Related memo interactions
}
```

### AI Processing Pipeline
1. **User creates memo** → Saved immediately to database
2. **Background AI processing** → `processAndUpdateMemo()` called asynchronously
3. **Dual AI processing**:
   - **Content analysis**: GPT-4o-mini extracts structured metadata (JSON)
   - **Vector embedding**: text-embedding-3-small generates 1536-dim vector
4. **Database update** → Metadata and embedding stored via server action
5. **UI refresh** → React Query invalidation triggers re-render

### Search & Discovery Architecture

**Related Memo Discovery** (`lib/actions/related.ts`):
- Cosine similarity search using pgvector operators
- Configurable similarity thresholds (default 0.6-0.7)
- Automatic relationship strength calculation

**Multi-Mode Search** (`lib/actions/search.ts`):
- Semantic search with vector similarity and fallback to text search
- Hybrid search combining results with score-based ranking
- Query embedding generation for semantic matching

### Key Architectural Patterns

#### Server Actions Pattern
All data mutations use Next.js 15 Server Actions with:
- **Zod validation** for type safety and runtime checks
- **User authentication** verification on every action
- **Automatic revalidation** via `revalidatePath()`
- **Error handling** with proper user feedback

#### Component Composition
- **Compound components** (Card family) for flexible UI composition
- **Variant-based styling** using class-variance-authority
- **Forward refs** for proper DOM access in ui components
- **Controlled components** with proper state management

#### Date Handling
- **Custom date utilities** (`lib/utils/date.ts`) prevent hydration mismatches
- **Consistent formatting** across server and client rendering
- **Timezone-safe** operations using explicit formatting

### Directory Structure Patterns
```
app/
├── (auth)/              # Route groups for layout organization
│   ├── login/page.tsx   # Auth pages with dedicated layout
│   └── signup/page.tsx
└── page.tsx             # Main app with tabbed interface (Memos/Graph/Stats)

components/
├── ui/                  # Base shadcn/ui components (Button, Card, Tabs, etc.)
├── auth/                # Authentication-specific components  
└── memo/                # Domain-specific memo components
    ├── memo-list.tsx    # Main memo display with integrated search
    ├── memo-card.tsx    # Individual memo with related memos toggle
    ├── search-bar.tsx   # Multi-mode search interface
    ├── graph-view.tsx   # Cytoscape.js knowledge graph
    ├── related-memos.tsx # Semantic similarity display
    └── memo-stats.tsx   # Analytics dashboard

lib/
├── actions/             # Server actions (data layer)
│   ├── memo.ts          # Basic CRUD operations
│   ├── related.ts       # Related memo discovery
│   ├── search.ts        # Multi-mode search implementation
│   └── ai.ts            # AI processing coordination
├── ai/                  # AI integration and processing
│   └── openai.ts        # OpenAI API calls and embedding generation
├── supabase/            # Database client configuration
└── utils/               # Utility functions (date, styling)
```

### Error Handling Strategy
- **Graceful AI failures**: App continues to work without AI features
- **Environment validation**: Middleware checks for required env vars
- **User feedback**: Loading states and error messages for all operations
- **Fallback content**: Default values when AI processing fails

### Performance Considerations
- **Vector indexing**: IVFFlat index on embeddings for fast similarity search
- **Server components**: Initial data fetching without client hydration
- **React Query caching**: Efficient client-side data management
- **Async AI processing**: Non-blocking background content analysis

### Development Guidelines

#### Adding New Features
1. **Create Zod schema** for any new data structures
2. **Add server action** in `lib/actions/` for data operations
3. **Update database types** in `types/database.ts`
4. **Create components** following existing composition patterns
5. **Handle loading/error states** consistently

#### Working with AI Features
- **Test with fallbacks**: Ensure features work when AI is unavailable
- **Structure prompts carefully**: Use JSON mode for consistent outputs
- **Handle rate limits**: Implement proper error handling for API limits
- **Monitor costs**: Be mindful of embedding generation frequency

#### Working with Search & Graph Features
- **Vector similarity**: Use `findSimilarMemos()` for semantic relationships
- **Search modes**: Leverage hybrid search for best user experience
- **Graph performance**: Limit nodes and edges for smooth visualization
- **Similarity thresholds**: Adjust based on content type and user feedback

#### Database Changes
- **Update schema**: Modify `supabase/schema.sql` for any table changes
- **Update types**: Regenerate TypeScript types from Supabase
- **Consider RLS**: Ensure new tables/columns have proper security policies
- **Index strategically**: Add indexes for query performance
- **Vector operations**: Use pgvector operators (`<=>` for cosine distance)

### Common Patterns

#### Server Action Template
```typescript
export async function actionName(data: ActionSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const validated = schema.parse(data)
  // ... operation
  
  revalidatePath('/relevant-path')
}
```

#### Component with Server Action
```typescript
'use client'
export function Component() {
  const [isPending, startTransition] = useTransition()
  
  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      await serverAction(formData)
    })
  }
  
  return <form action={handleAction}>...</form>
}
```

#### Vector Search Pattern
```typescript
// Semantic similarity search with pgvector
const { data, error } = await supabase
  .from('memos')
  .select(`*, embedding <=> '${embeddingString}' as similarity`)
  .eq('user_id', userId)
  .order('similarity', { ascending: true })
  .limit(limit)
```

#### Graph Visualization Pattern
```typescript
// Cytoscape.js initialization with dynamic loading
const cytoscape = (await import('cytoscape')).default
const cy = cytoscape({
  container: containerRef.current,
  elements: [...nodes, ...edges],
  style: categoryBasedStyling,
  layout: { name: 'cose', fit: true }
})
```

### UX Enhancement Features (Recently Added)

**Undo System** (`lib/stores/undo-store.ts`):
- Zustand-based state management for pending deletions
- 5-second grace period with toast notifications
- Safe deletion system preventing accidental data loss

**Keyboard Shortcuts** (`lib/hooks/use-keyboard-shortcuts.ts`):
- Platform-aware shortcuts (Ctrl/Cmd detection)
- Context-sensitive enabling/disabling
- Custom hook for global and local shortcut management
- Built-in shortcuts: Ctrl+N (new memo), Ctrl+K (search), Ctrl+S (save), Ctrl+H (help)

**Comprehensive Help System** (`lib/data/help-content.ts`):
- Structured help content with categories and search
- FAQ system with tagging
- Interactive help modal with tabbed navigation
- Markdown-rendered documentation with syntax highlighting

**Toast Notification System** (`components/ui/toast.tsx`):
- Zustand-based toast state management
- Auto-dismissing notifications with custom durations
- Action buttons for user interactions (e.g., Undo)

### Recent Architectural Improvements

**Japanese-Only AI Processing**:
- All AI-generated content (tags, categories, summaries) in Japanese
- Optimized prompts for Japanese content analysis
- Default category changed from 'General' to '一般'

**Enhanced Graph Visualization**:
- Improved error handling for Cytoscape initialization
- Grid layout fallback for better stability
- Debug logging for graph construction
- Lower similarity thresholds (0.3) for more connections

**Improved User Feedback**:
- Loading states for all async operations
- Visual feedback for keyboard shortcuts availability
- Detailed error messages with recovery suggestions
- Real-time status indicators

### Knowledge Graph Troubleshooting
If the knowledge graph doesn't display:
1. Check console for Cytoscape initialization errors
2. Verify memos exist and have embeddings
3. Lower similarity threshold in `graph-view.tsx` if needed
4. Ensure container ref is properly attached

### Keyboard Shortcuts Integration
To add new shortcuts to a component:
```typescript
const shortcuts: KeyboardShortcut[] = [
  {
    key: 'n',
    ctrlKey: true,
    description: '新規作成',
    action: () => handleNew(),
    enabled: !isDisabled
  }
]
useKeyboardShortcuts(shortcuts)
```

### Toast Notifications Pattern
```typescript
const { toast } = useToast()

toast({
  title: 'タイトル',
  description: '説明文',
  duration: 5000,
  action: <Button onClick={handleAction}>アクション</Button>
})
```

### Current Implementation Status

**Fully Implemented & Production Ready**:
- Complete memo CRUD with AI enhancement and undo functionality
- Multi-modal search (semantic, text, hybrid) with keyboard shortcuts
- Interactive knowledge graph with improved error handling
- Related memo discovery and display
- Analytics dashboard with engagement tracking
- Comprehensive help system with searchable documentation
- Japanese-optimized AI processing pipeline
- Toast notification system with action support
- Responsive design with tabbed interface and accessibility features

**Architecture Prepared For**:
- PWA capabilities (next-pwa ready)
- Real-time collaboration (Supabase subscriptions)
- Browser extension integration
- Mobile app development

### Performance & Scalability Notes
- **Vector indexing**: IVFFlat index optimized for 100 lists
- **Search performance**: Hybrid approach balances accuracy and speed
- **Graph rendering**: All memos displayed with grid layout for stability
- **AI processing**: Asynchronous to avoid blocking user interactions
- **Caching**: React Query handles client-side caching efficiently
- **Help content**: Structured for fast search and navigation