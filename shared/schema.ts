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
export const storyCategories = ["real", "creepy", "roleplay"] as const;
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
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertStorySchema = createInsertSchema(stories)
  .pick({ title: true, synopsis: true, category: true, tags: true, accentHue: true, isMature: true })
  .extend({
    title: z.string().min(3, "Título muito curto").max(120),
    synopsis: z.string().min(10, "Escreva uma sinopse um pouco maior").max(400),
    category: z.enum(storyCategories),
    tags: z.array(z.string()).default([]),
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
export const reportTargets = ["story", "part", "comment"] as const;
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
