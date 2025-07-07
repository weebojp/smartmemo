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