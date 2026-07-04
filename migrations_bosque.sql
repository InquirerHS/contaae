-- Bosque Assombrado + IA de moderação
-- Cria: forum_topics, forum_posts (threading via parent_id), moderation_flags
-- Reclassifica histórias da categoria 'creepy' (removida) para 'real'
-- Aplicada sobre um banco já com as tabelas anteriores (users, stories, ... quest_arguments).

-- 1) Reclassifica creepy -> real (a categoria 'creepy' foi removida do schema)
UPDATE stories SET category = 'real' WHERE category = 'creepy';

-- 2) Tópicos do Bosque Assombrado (fórum)
CREATE TABLE IF NOT EXISTS forum_topics (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  author_id integer NOT NULL REFERENCES users(id),
  is_mature integer DEFAULT 0,
  accent_hue integer DEFAULT 270,
  status text NOT NULL DEFAULT 'open',
  reply_count integer NOT NULL DEFAULT 0,
  created_at text NOT NULL DEFAULT (datetime('now')),
  updated_at text NOT NULL DEFAULT (datetime('now'))
);

-- 3) Respostas encadeadas (parentId => parent_id)
CREATE TABLE IF NOT EXISTS forum_posts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  topic_id integer NOT NULL REFERENCES forum_topics(id),
  author_id integer NOT NULL REFERENCES users(id),
  parent_id integer,                       -- null = resposta direta ao tópico
  content text NOT NULL,
  created_at text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON forum_posts(parent_id);

-- 4) Sinalizações da IA de moderação (para revisão humana)
CREATE TABLE IF NOT EXISTS moderation_flags (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  target_type text NOT NULL,              -- story | part | comment | forum_topic | forum_post | character | quest | quest_post
  target_id integer NOT NULL,
  classification text NOT NULL,           -- ok | borderline | violation
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',    -- open | kept | hidden | removed
  resolved_by_id integer,
  resolution_note text,
  created_at text NOT NULL DEFAULT (datetime('now')),
  resolved_at text
);
CREATE INDEX IF NOT EXISTS idx_mod_flags_target ON moderation_flags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_mod_flags_status ON moderation_flags(status);
