# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SmartMemo - AI-Powered Knowledge Management System

SmartMemo is a Next.js 15 application that combines AI processing, vector embeddings, and advanced search capabilities to create an intelligent personal knowledge management system. The app automatically analyzes, categorizes, and connects memos while providing sophisticated search and bulk management features.

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project with pgvector extension
- OpenAI API key (GPT-4o-mini and text-embedding-3-small)

### Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations
- `OPENAI_API_KEY` - OpenAI API key for AI processing

### Commands
```bash
npm install              # Install dependencies
npm run dev              # Start development server with Turbopack at localhost:3000
npm run build            # Build production version
npm run start            # Start production server
npm run lint             # Run ESLint checks
```

### Database Setup
1. Enable pgvector extension in Supabase SQL Editor
2. Run the SQL schema in `supabase/schema.sql`
3. Ensure RLS policies are enabled for security

The schema creates:
- `memos` table with vector embeddings (1536 dimensions)
- `memo_relations` table for semantic relationships
- IVFFlat index for efficient similarity search
- RLS policies for user data isolation

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, custom UI components, Cytoscape.js for graph visualization
- **Backend**: Server Actions (no API routes), Supabase as BaaS
- **Database**: Supabase PostgreSQL + pgvector for vector embeddings
- **AI**: OpenAI GPT-4o-mini + text-embedding-3-small
- **State**: React Query for server state, Zustand for client state (undo, selection, toast)

### Authentication & Security
- **Supabase Auth** with cookie-based sessions managed via middleware
- **Row Level Security (RLS)** ensures user data isolation
- **Server/client separation**: `lib/supabase/server.ts` vs `lib/supabase/client.ts`
- **Protected routes** handled by middleware with proper redirects

### Core Features Implemented

**AI-Powered Knowledge Management**:
- Automatic content analysis with Japanese-optimized tag generation, categorization, and summarization
- Vector embeddings (1536-dim) for semantic similarity and search
- Related memo discovery based on cosine similarity with configurable thresholds
- Background AI processing that doesn't block user interactions

**Multi-Modal Search System**:
- **Semantic Search**: Vector similarity search with pgvector operators
- **Text Search**: PostgreSQL full-text search across all metadata fields
- **Hybrid Search**: Weighted combination (70% semantic, 30% text) with score-based ranking
- **Advanced Search**: Multi-criteria filtering with tags, categories, date ranges, content length, and AI processing status

**Bulk Operations & Data Management**:
- **Selection System**: Multi-select memos with floating operations bar
- **Bulk Actions**: Delete (with undo), add tags, change categories, export
- **Import/Export**: Support for Markdown (YAML frontmatter), JSON, CSV, and Obsidian formats
- **Undo System**: 5-second grace period for deletions with toast notifications

**Interactive Knowledge Graph**:
- Cytoscape.js visualization with grid layout for stability
- Category-based color coding and similarity-based edge weights
- Debug logging and error handling for robust display
- Full-screen expandable view with node interaction

**User Experience Enhancements**:
- **Keyboard Shortcuts**: Platform-aware (Ctrl/Cmd+N, K, S, H, ?)
- **Help System**: Comprehensive documentation with FAQ and search
- **Toast Notifications**: Action feedback with undo capabilities
- **Responsive Design**: Tabbed interface with mobile support

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
- **Zod validation** for input validation and type safety
- **User authentication** verification via Supabase auth check
- **Automatic revalidation** via `revalidatePath('/')` after mutations
- **Structured responses** with success/error states and data

#### Component Architecture
- **Server Components** for initial data fetching and SEO
- **Client Components** for interactivity with 'use client' directive
- **Custom UI Components** replacing Radix UI dependencies for smaller bundle
- **Compound Components** pattern for flexible composition
- **Forward Refs** for proper DOM element access

#### State Management Patterns
- **Zustand Stores**: Client-side state for undo, selection, and toast
- **React Query**: Server state caching and synchronization
- **Optimistic Updates**: Immediate UI feedback with rollback on error
- **Server State**: All persistent data flows through server actions

#### Error Handling Strategy
- **Graceful AI Failures**: App functions without AI features if API fails
- **User Feedback**: Toast notifications for all operations
- **Fallback Strategies**: Text search when semantic search fails
- **Type Safety**: TypeScript with strict null checks

### Directory Structure and Key Files

```
app/                     # Next.js 15 App Router
├── (auth)/             # Auth route group with minimal layout
│   ├── login/          # Login page with email/password
│   └── signup/         # Signup with email verification
├── page.tsx            # Main app - tabbed interface (Memos/Graph/Stats)
└── layout.tsx          # Root layout with providers

components/
├── ui/                 # Custom UI components (no Radix UI)
│   ├── button.tsx      # Variant-based button with CVA
│   ├── card.tsx        # Compound card components
│   ├── toast.tsx       # Zustand-based toast system
│   └── tabs.tsx        # Tab navigation components
├── auth/               # Auth components (login/signup forms)
└── memo/               # Feature components
    ├── memo-list.tsx   # Server component with search integration
    ├── memo-card.tsx   # Individual memo with actions
    ├── search-bar.tsx  # Multi-mode search UI
    ├── graph-view.tsx  # Cytoscape.js visualization
    ├── bulk-operations-bar.tsx  # Floating selection actions
    ├── advanced-search.tsx      # Multi-criteria filters
    └── import-dialog.tsx        # Import wizard UI

lib/
├── actions/            # Server actions (all data mutations)
│   ├── memo.ts         # CRUD operations with Zod validation
│   ├── search.ts       # Semantic, text, hybrid, advanced search
│   ├── bulk-operations.ts  # Bulk delete, tag, export actions
│   └── import.ts       # Import processing and validation
├── stores/             # Zustand client state
│   ├── undo-store.ts   # Pending deletions with timeouts
│   └── selection-store.ts  # Multi-select state management
├── import/             # Import infrastructure
│   └── import-parser.ts    # Format parsers (MD, JSON, CSV, Obsidian)
└── export/             # Export infrastructure
    └── export-formats.ts   # Multi-format export generators
```

### Critical Implementation Notes

#### Server Actions Best Practices
- Always validate inputs with Zod schemas before processing
- Check user authentication at the start of every server action
- Return structured responses: `{ success: boolean, data?: any, error?: string }`
- Call `revalidatePath('/')` after data mutations to update UI
- Handle errors gracefully with try-catch and return error messages

#### AI Processing Guidelines
- AI processing happens asynchronously after memo creation
- Use `processAndUpdateMemo()` for background AI analysis
- Always provide fallbacks when AI features fail
- Japanese prompts yield better results for Japanese content
- Default category should be '一般' not 'General'

#### Search Implementation
- Semantic search requires embeddings - fallback to text search if missing
- Hybrid search combines 70% semantic + 30% text results
- Advanced search filters apply on top of base search results
- Use pgvector's `<=>` operator for cosine distance calculations
- Lower similarity thresholds (0.3) for knowledge graph connections

#### Import/Export Considerations
- Always validate imported data structure before processing
- Support YAML frontmatter in Markdown files
- Handle duplicate detection using content prefix matching
- Process imports in batches to avoid timeouts
- Export includes metadata based on user preferences

### Common Patterns

#### Server Action Template
```typescript
export async function actionName(data: ActionSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const validated = schema.parse(data)
  // ... operation
  
  revalidatePath('/')
  
  return {
    success: true,
    data: result,
    // Include relevant response data for client feedback
  }
}
```

#### Bulk Operations Pattern
```typescript
// Server action with comprehensive error handling
export async function bulkOperation(data: BulkSchema) {
  const result = { success: true, processed: 0, errors: [] }
  
  try {
    for (const item of data.items) {
      try {
        // Process individual item
        await processItem(item)
        result.processed++
      } catch (error) {
        result.errors.push({
          item: item.id,
          message: error.message
        })
      }
    }
    
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

#### Advanced Search Pattern
```typescript
// Flexible search with multiple filter types
let query = supabase.from('memos').select('*')

// Apply text search
if (filters.query) {
  query = query.or(`content.ilike.%${filters.query}%`)
}

// Apply array filters
if (filters.tags.length > 0) {
  query = query.overlaps('tags', filters.tags)
}

// Apply date range
if (filters.dateRange.start) {
  query = query.gte('created_at', filters.dateRange.start.toISOString())
}

// Apply sorting and limit
query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
return query.limit(20)
```

#### Import/Export Pattern
```typescript
// File processing with format detection
export function parseImportedFile(content: string, filename: string) {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  
  switch (extension) {
    case '.md':
    case '.markdown':
      return parseMarkdownImport(content, options)
    case '.json':
      return parseJSONImport(content, options)
    case '.csv':
      return parseCSVImport(content, options)
    default:
      throw new Error(`Unsupported format: ${extension}`)
  }
}
```

#### Component with Server Action
```typescript
'use client'
export function Component() {
  const [isPending, startTransition] = useTransition()
  
  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await serverAction(formData)
      if (result.success) {
        toast({ title: 'Success!' })
      }
    })
  }
  
  return <form action={handleAction}>...</form>
}
```

#### Vector Search Pattern
```typescript
// Semantic similarity search with pgvector
const embeddingString = `[${embedding.join(',')}]`
const { data } = await supabase
  .from('memos')
  .select(`*, embedding <=> '${embeddingString}' as similarity`)
  .eq('user_id', userId)
  .order('similarity', { ascending: true })
  .limit(10)
```

#### Graph Visualization Pattern
```typescript
// Cytoscape.js initialization with dynamic loading
const cytoscape = (await import('cytoscape')).default
const cy = cytoscape({
  container: containerRef.current,
  elements: [...nodes, ...edges],
  style: categoryBasedStyling,
  layout: { name: 'grid', fit: true } // Grid layout for stability
})
```

### Troubleshooting Common Issues

#### Knowledge Graph Not Displaying
- Check browser console for Cytoscape initialization errors
- Verify memos have embeddings: `SELECT count(*) FROM memos WHERE embedding IS NOT NULL`
- Grid layout is used for stability - if switching to 'cose', ensure proper physics settings
- Container ref must be attached before initialization

#### Build Errors
- TypeScript strict mode is enabled - handle all nullable values
- ESLint configured for Next.js - use proper disable comments when needed
- Missing Radix UI deps - we use custom components instead
- Dynamic imports for Cytoscape to avoid SSR issues

#### AI Processing Failures
- Check OpenAI API key is valid and has credits
- Verify rate limits aren't exceeded
- Fallback to manual categorization if AI fails
- Embeddings are optional - search still works without them

### Testing Locally

```bash
# Run development server
npm run dev

# Test key features:
# 1. Create a memo and verify AI processing (tags, category, summary)
# 2. Search using different modes (semantic, text, hybrid)
# 3. Select multiple memos and test bulk operations
# 4. Import sample data (Markdown/JSON/CSV files)
# 5. Export memos in different formats
# 6. Check knowledge graph visualization
# 7. Test keyboard shortcuts (Ctrl/Cmd + N, K, S, H)
```

### Performance Optimization Tips

- **Limit graph nodes**: For large datasets, consider pagination or filtering
- **Batch operations**: Process imports/exports in chunks to avoid timeouts  
- **Debounce search**: Already implemented with 300ms delay
- **Lazy load Cytoscape**: Dynamic imports prevent blocking initial load
- **Cache embeddings**: Reuse existing embeddings when content unchanged