-- Taverna migration: characters, quests, quest_participants, quest_posts, quest_arguments

CREATE TABLE IF NOT EXISTS characters (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  name text NOT NULL,
  concept text NOT NULL,
  created_at text NOT NULL DEFAULT (datetime('now')),
  updated_at text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quests (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  title text NOT NULL,
  gm_id integer NOT NULL REFERENCES users(id),
  setting text NOT NULL,
  situation text NOT NULL,
  brief text NOT NULL,
  slots_total integer NOT NULL,
  seeking text NOT NULL,
  is_mature integer DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  accent_hue integer DEFAULT 190,
  created_at text NOT NULL DEFAULT (datetime('now')),
  updated_at text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quest_participants (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  quest_id integer NOT NULL REFERENCES quests(id),
  user_id integer NOT NULL REFERENCES users(id),
  character_id integer NOT NULL REFERENCES characters(id),
  intro text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  joined_at text NOT NULL DEFAULT (datetime('now')),
  UNIQUE (quest_id, user_id)
);

CREATE TABLE IF NOT EXISTS quest_posts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  quest_id integer NOT NULL REFERENCES quests(id),
  author_id integer NOT NULL REFERENCES users(id),
  character_id integer REFERENCES characters(id),
  content text NOT NULL,
  "order" integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  removed_reason text,
  removed_by_id integer,
  replaced_by_id integer,
  created_at text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quest_arguments (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  post_id integer NOT NULL REFERENCES quest_posts(id),
  author_id integer NOT NULL REFERENCES users(id),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  gm_note text,
  created_at text NOT NULL DEFAULT (datetime('now'))
);
