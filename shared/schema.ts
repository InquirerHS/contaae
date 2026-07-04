import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------- USERS ----------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  birthDate: text("birth_date").notNull(), // ISO yyyy-mm-dd
  bio: text("bio").default(""),
  avatarHue: integer("avatar_hue").default(200),
  avatarUrl: text("avatar_url"), // optional uploaded image URL
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({ username: true, email: true, password: true, birthDate: true, bio: true, avatarHue: true })
  .extend({
    username: z.string().min(3, "Nome de usuário precisa de ao menos 3 caracteres").max(24),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Senha precisa de ao menos 6 caracteres"),
    birthDate: z.string().refine((d) => {
      const birth = new Date(d);
      if (isNaN(birth.getTime())) return false;
      const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    }, "Não aceitamos cadastro de menores de idade em razão da legislação vigente"),
  });

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

// Safe user (no password) returned to the client
export type SafeUser = Omit<User, "password">;

// ---------- NOTIFICATIONS ----------
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id), // recipient
  actorId: integer("actor_id").references(() => users.id), // who triggered (nullable for system)
  type: text("type").notNull(), // 'like' | 'comment' | 'part' | 'report'
  storyId: integer("story_id"),
  partId: integer("part_id"),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export type Notification = typeof notifications.$inferSelect;

// ---------- STORIES ----------
export const storyCategories = ["real", "roleplay"] as const;
export type StoryCategory = (typeof storyCategories)[number];
export const storyStatuses = ["open", "ongoing", "completed"] as const;
export type StoryStatus = (typeof storyStatuses)[number];

export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  synopsis: text("synopsis").notNull(),
  category: text("category", { enum: storyCategories }).notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  status: text("status", { enum: storyStatuses }).notNull().default("open"),
  tags: text("tags").notNull().default("[]"), // JSON array string
  accentHue: integer("accent_hue").default(190),
  isMature: integer("is_mature", { mode: "boolean" }).default(false),
  aiEnabled: integer("ai_enabled", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertStorySchema = createInsertSchema(stories)
  .pick({ title: true, synopsis: true, category: true, tags: true, accentHue: true, isMature: true, aiEnabled: true })
  .extend({
    title: z.string().min(3, "Título muito curto").max(120),
    synopsis: z.string().min(10, "Escreva uma sinopse um pouco maior").max(400),
    category: z.enum(storyCategories),
    tags: z.array(z.string()).default([]),
    aiEnabled: z.boolean().default(true),
  });

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

// ---------- STORY PARTS ----------
export const storyParts = sqliteTable("story_parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => stories.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  order: integer("order").notNull(),
  isAi: integer("is_ai", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertStoryPartSchema = createInsertSchema(storyParts)
  .pick({ storyId: true, content: true })
  .extend({
    content: z.string().min(20, "Escreva ao menos 20 caracteres").max(6000),
  });

export type InsertStoryPart = z.infer<typeof insertStoryPartSchema>;
export type StoryPart = typeof storyParts.$inferSelect;

// ---------- LIKES ----------
export const likes = sqliteTable("likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => stories.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export type Like = typeof likes.$inferSelect;

// ---------- COMMENTS ----------
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => stories.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertCommentSchema = createInsertSchema(comments)
  .pick({ storyId: true, content: true })
  .extend({
    content: z.string().min(2, "Comentário muito curto").max(800),
  });

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// ---------- REPORTS ----------
export const reportTargets = ["story", "part", "comment", "forum_topic", "forum_post", "character", "quest", "quest_post"] as const;
export type ReportTarget = (typeof reportTargets)[number];
export const reportStatuses = ["open", "reviewing", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  targetType: text("target_type", { enum: reportTargets }).notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: reportStatuses }).notNull().default("open"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertReportSchema = createInsertSchema(reports)
  .pick({ targetType: true, targetId: true, reason: true })
  .extend({
    targetType: z.enum(reportTargets),
    targetId: z.number().int().positive(),
    reason: z.string().min(3, "Descreva o motivo").max(500),
  });

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// ---------- RATINGS ----------
export const ratings = sqliteTable("ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => stories.id),
  userId: integer("user_id").notNull().references(() => users.id),
  score: integer("score").notNull(), // 1..5
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertRatingSchema = createInsertSchema(ratings)
  .pick({ storyId: true, score: true })
  .extend({
    storyId: z.number().int().positive(),
    score: z.number().int().min(1, "Nota mínima é 1").max(5, "Nota máxima é 5"),
  });

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

// ---------- CHARACTERS (fichas reutilizáveis, máx 2 por usuário) ----------
export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  concept: text("concept").notNull(), // como se comporta, personalidade, histórico
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertCharacterSchema = createInsertSchema(characters)
  .pick({ name: true, concept: true })
  .extend({
    name: z.string().min(2, "Nome curto demais").max(60),
    concept: z.string().min(10, "Descreva melhor o personagem").max(2000),
  });

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

// ---------- QUESTS (Taverna — RP com GM, sem dados/PV) ----------
export const questStatuses = ["open", "ongoing", "completed", "closed"] as const;
export type QuestStatus = (typeof questStatuses)[number];

export const quests = sqliteTable("quests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  gmId: integer("gm_id").notNull().references(() => users.id),
  setting: text("setting").notNull(),       // o ambiente
  situation: text("situation").notNull(),     // a situação
  brief: text("brief").notNull(),             // do que precisa
  slotsTotal: integer("slots_total").notNull(), // quantas pessoas
  seeking: text("seeking").notNull(),         // tipo livre (ex.: "fantasia estilo star wars")
  isMature: integer("is_mature", { mode: "boolean" }).default(false),
  status: text("status", { enum: questStatuses }).notNull().default("open"),
  accentHue: integer("accent_hue").default(190),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertQuestSchema = createInsertSchema(quests)
  .pick({ title: true, setting: true, situation: true, brief: true, slotsTotal: true, seeking: true, isMature: true, accentHue: true })
  .extend({
    title: z.string().min(3, "Título curto demais").max(120),
    setting: z.string().min(10, "Descreva o ambiente").max(2000),
    situation: z.string().min(10, "Descreva a situação").max(2000),
    brief: z.string().min(10, "Diga do que precisa").max(2000),
    slotsTotal: z.number().int().min(1, "Ao menos 1 vaga").max(8, "Máximo de 8 vagas"),
    seeking: z.string().min(3, "Diga quem procura").max(500),
  });

export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof quests.$inferSelect;

// ---------- QUEST PARTICIPANTS (quem entrou, com qual ficha) ----------
export const participantStatuses = ["active", "removed"] as const;
export type ParticipantStatus = (typeof participantStatuses)[number];

export const questParticipants = sqliteTable("quest_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questId: integer("quest_id").notNull().references(() => quests.id),
  userId: integer("user_id").notNull().references(() => users.id),
  characterId: integer("character_id").notNull().references(() => characters.id),
  intro: text("intro").notNull(), // descrição da entrada
  status: text("status", { enum: participantStatuses }).notNull().default("active"),
  joinedAt: text("joined_at").notNull().default(new Date().toISOString()),
});

export const insertParticipantSchema = createInsertSchema(questParticipants)
  .pick({ characterId: true, intro: true })
  .extend({
    characterId: z.number().int().positive(),
    intro: z.string().min(10, "Descreva sua entrada").max(2000),
  });

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type QuestParticipant = typeof questParticipants.$inferSelect;

// ---------- QUEST POSTS (a narrativa, com fluxo de moderação) ----------
export const questPostStatuses = ["active", "removed", "pending"] as const;
export type QuestPostStatus = (typeof questPostStatuses)[number];

export const questPosts = sqliteTable("quest_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questId: integer("quest_id").notNull().references(() => quests.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  characterId: integer("character_id"), // null = narração do GM (ambiente/NPCs)
  content: text("content").notNull(),
  order: integer("order").notNull(),
  status: text("status", { enum: questPostStatuses }).notNull().default("active"),
  removedReason: text("removed_reason"),
  removedById: integer("removed_by_id"),
  replacedById: integer("replaced_by_id"), // revisão aponta para o original
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertQuestPostSchema = createInsertSchema(questPosts)
  .pick({ characterId: true, content: true })
  .extend({
    characterId: z.number().int().positive().nullable(),
    content: z.string().min(20, "Trecho curto demais").max(6000),
  });

export type InsertQuestPost = z.infer<typeof insertQuestPostSchema>;
export type QuestPost = typeof questPosts.$inferSelect;

// ---------- QUEST ARGUMENTS (jogador argumenta contra remoção) ----------
export const argumentStatuses = ["pending", "accepted", "rejected"] as const;
export type ArgumentStatus = (typeof argumentStatuses)[number];

export const questArguments = sqliteTable("quest_arguments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull().references(() => questPosts.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  status: text("status", { enum: argumentStatuses }).notNull().default("pending"),
  gmNote: text("gm_note"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertArgumentSchema = createInsertSchema(questArguments)
  .pick({ postId: true, content: true })
  .extend({
    postId: z.number().int().positive(),
    content: z.string().min(10, "Argumente seu ponto").max(2000),
  });

export type InsertArgument = z.infer<typeof insertArgumentSchema>;
export type QuestArgument = typeof questArguments.$inferSelect;

// ---------- BOSQUE ASSOMBRADO (fórum com threading) ----------
export const forumTopicStatuses = ["open", "closed"] as const;
export type ForumTopicStatus = (typeof forumTopicStatuses)[number];

export const forumTopics = sqliteTable("forum_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  isMature: integer("is_mature", { mode: "boolean" }).default(false),
  accentHue: integer("accent_hue").default(270),
  status: text("status", { enum: forumTopicStatuses }).notNull().default("open"),
  replyCount: integer("reply_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertForumTopicSchema = createInsertSchema(forumTopics)
  .pick({ title: true, body: true, isMature: true, accentHue: true })
  .extend({
    title: z.string().min(3, "Título muito curto").max(140),
    body: z.string().min(20, "Conte um pouco mais da história").max(8000),
  });

export type InsertForumTopic = z.infer<typeof insertForumTopicSchema>;
export type ForumTopic = typeof forumTopics.$inferSelect;

// ---------- FORUM POSTS (respostas encadeadas via parentId) ----------
export const forumPosts = sqliteTable("forum_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id").notNull().references(() => forumTopics.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  parentId: integer("parent_id"), // null = resposta direta ao tópico
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertForumPostSchema = createInsertSchema(forumPosts)
  .pick({ topicId: true, parentId: true, content: true })
  .extend({
    topicId: z.number().int().positive(),
    parentId: z.number().int().positive().nullable().optional(),
    content: z.string().min(2, "Resposta muito curta").max(4000),
  });

export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;

// ---------- MODERATION FLAGS (sinalizações da IA para revisão humana) ----------
export const moderationTargets = ["story", "part", "comment", "forum_topic", "forum_post", "character", "quest", "quest_post"] as const;
export type ModerationTarget = (typeof moderationTargets)[number];

export const moderationClasses = ["ok", "borderline", "violation"] as const;
export type ModerationClass = (typeof moderationClasses)[number];

export const moderationFlagStatuses = ["open", "kept", "hidden", "removed"] as const;
export type ModerationFlagStatus = (typeof moderationFlagStatuses)[number];

export const moderationFlags = sqliteTable("moderation_flags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetType: text("target_type", { enum: moderationTargets }).notNull(),
  targetId: integer("target_id").notNull(),
  classification: text("classification", { enum: moderationClasses }).notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: moderationFlagStatuses }).notNull().default("open"),
  resolvedById: integer("resolved_by_id"),
  resolutionNote: text("resolution_note"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  resolvedAt: text("resolved_at"),
});

export type ModerationFlag = typeof moderationFlags.$inferSelect;

// Resultado retornado pelo classificador de moderação
export interface ModerationResult {
  classification: ModerationClass;
  reason: string;
}
