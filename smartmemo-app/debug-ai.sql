-- AI処理の状態を確認するSQLクエリ

-- 最新のメモ10件の処理状態を確認
SELECT 
  id,
  LEFT(content, 50) as content_preview,
  tags,
  category,
  summary,
  processed_at,
  CASE 
    WHEN processed_at IS NOT NULL THEN 'Processed'
    ELSE 'Not Processed'
  END as ai_status,
  created_at
FROM memos
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- AI処理されていないメモの数を確認
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as unprocessed_count,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count,
  COUNT(*) as total_count
FROM memos
WHERE user_id = auth.uid();

-- 最新のメモの詳細を確認
SELECT *
FROM memos
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;