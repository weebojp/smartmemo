-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memos table
CREATE TABLE IF NOT EXISTS memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  embedding vector(1536),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  source TEXT CHECK (source IN ('manual', 'web', 'api')) DEFAULT 'manual',
  source_url TEXT,
  source_title TEXT,
  
  -- AI generated fields
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  summary TEXT,
  keywords TEXT[] DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  related_click_count INTEGER DEFAULT 0
);

-- Create memo_relations table
CREATE TABLE IF NOT EXISTS memo_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  related_memo_id UUID NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('semantic', 'reference', 'temporal')) DEFAULT 'semantic',
  strength DECIMAL(3,2) CHECK (strength >= 0 AND strength <= 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(memo_id, related_memo_id)
);

-- Create indexes
CREATE INDEX idx_memos_user_id ON memos(user_id);
CREATE INDEX idx_memos_created_at ON memos(created_at DESC);
CREATE INDEX idx_memos_embedding ON memos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memo_relations_memo_id ON memo_relations(memo_id);
CREATE INDEX idx_memo_relations_related_memo_id ON memo_relations(related_memo_id);
CREATE INDEX idx_memo_relations_strength ON memo_relations(strength DESC);

-- Create RLS policies
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo_relations ENABLE ROW LEVEL SECURITY;

-- Memos policies
CREATE POLICY "Users can view own memos" ON memos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memos" ON memos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memos" ON memos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memos" ON memos
  FOR DELETE USING (auth.uid() = user_id);

-- Memo relations policies
CREATE POLICY "Users can view own memo relations" ON memo_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memos 
      WHERE memos.id = memo_relations.memo_id 
      AND memos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own memo relations" ON memo_relations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memos 
      WHERE memos.id = memo_relations.memo_id 
      AND memos.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON memos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function for incrementing related click count
CREATE OR REPLACE FUNCTION increment_related_click_count(memo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE memos 
  SET related_click_count = related_click_count + 1 
  WHERE id = memo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB,
  result_count INTEGER DEFAULT 0,
  search_type TEXT CHECK (search_type IN ('text', 'semantic', 'hybrid', 'complex', 'fuzzy', 'tag')) DEFAULT 'text',
  executed_at TIMESTAMPTZ DEFAULT now(),
  execution_time INTEGER DEFAULT 0 -- in milliseconds
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB,
  search_type TEXT CHECK (search_type IN ('text', 'semantic', 'hybrid', 'complex', 'fuzzy', 'tag')) DEFAULT 'text',
  auto_update BOOLEAN DEFAULT false,
  notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0
);

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  total_searches INTEGER DEFAULT 0,
  unique_queries INTEGER DEFAULT 0,
  avg_execution_time INTEGER DEFAULT 0,
  most_common_query TEXT,
  search_type_stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Create additional indexes for search functionality
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_executed_at ON search_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_user_query ON search_history(user_id, query);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_executed ON saved_searches(last_executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_auto_update ON saved_searches(auto_update) WHERE auto_update = true;

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_date ON search_analytics(user_id, date);

-- Enhanced search indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memos_content_gin ON memos USING GIN (
  to_tsvector('japanese', content)
);

CREATE INDEX IF NOT EXISTS idx_memos_tags_gin ON memos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_memos_keywords_gin ON memos USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_memos_category ON memos(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memos_summary ON memos USING GIN (
  to_tsvector('japanese', summary)
) WHERE summary IS NOT NULL;

-- Full-text search index combining multiple fields
CREATE INDEX IF NOT EXISTS idx_memos_full_text ON memos USING GIN (
  (setweight(to_tsvector('japanese', content), 'A') ||
   setweight(to_tsvector('japanese', COALESCE(summary, '')), 'B') ||
   setweight(to_tsvector('japanese', COALESCE(category, '')), 'C') ||
   setweight(to_tsvector('japanese', array_to_string(tags, ' ')), 'D') ||
   setweight(to_tsvector('japanese', array_to_string(keywords, ' ')), 'D'))
);

-- RLS policies for search tables
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Search history policies
CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history" ON search_history
  FOR DELETE USING (auth.uid() = user_id);

-- Saved searches policies
CREATE POLICY "Users can view own saved searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved searches" ON saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches" ON saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches" ON saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Search analytics policies
CREATE POLICY "Users can view own search analytics" ON search_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own search analytics" ON search_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search analytics" ON search_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to record search history
CREATE OR REPLACE FUNCTION record_search_history(
  p_user_id UUID,
  p_query TEXT,
  p_filters JSONB DEFAULT NULL,
  p_result_count INTEGER DEFAULT 0,
  p_search_type TEXT DEFAULT 'text',
  p_execution_time INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  history_id UUID;
BEGIN
  INSERT INTO search_history (
    user_id,
    query,
    filters,
    result_count,
    search_type,
    execution_time
  ) VALUES (
    p_user_id,
    p_query,
    p_filters,
    p_result_count,
    p_search_type,
    p_execution_time
  )
  RETURNING id INTO history_id;
  
  -- Update daily analytics
  INSERT INTO search_analytics (
    user_id,
    date,
    total_searches,
    unique_queries,
    avg_execution_time,
    most_common_query
  ) VALUES (
    p_user_id,
    CURRENT_DATE,
    1,
    1,
    p_execution_time,
    p_query
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_searches = search_analytics.total_searches + 1,
    avg_execution_time = (search_analytics.avg_execution_time * search_analytics.total_searches + p_execution_time) / (search_analytics.total_searches + 1),
    updated_at = now();
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old search history
CREATE OR REPLACE FUNCTION cleanup_search_history()
RETURNS void AS $$
BEGIN
  -- Delete search history older than 3 months
  DELETE FROM search_history 
  WHERE executed_at < now() - INTERVAL '3 months';
  
  -- Delete analytics older than 1 year
  DELETE FROM search_analytics 
  WHERE date < CURRENT_DATE - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;