import {
  users,
  stories,
  storyParts,
  likes,
  comments,
  notifications,
  reports,
  storyCategories,
  type StoryCategory,
} from "@shared/schema";
import type {
  User,
  SafeUser,
  Story,
  StoryPart,
  Comment,
  InsertUser,
  InsertStory,
  InsertStoryPart,
  InsertComment,
  Notification,
  Report,
  ReportTarget,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, ne, like, or, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
// foreign keys so deletes cascade cleanly handled in app layer
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

function parseTagsLocal(tags: string): string[] {
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function stripPassword(u: User | undefined): SafeUser | undefined {
  if (!u) return undefined;
  const { password, ...safe } = u;
  return safe;
}

export interface NotificationWithActor extends Notification {
  actor: SafeUser | null;
  storyTitle: string | null;
}

export interface ReportWithReporter extends Report {
  reporter: SafeUser;
}

export interface StoryWithRelations extends Story {
  author: SafeUser;
  partCount: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface PartWithAuthor extends StoryPart {
  author: SafeUser;
}

export interface CommentWithAuthor extends Comment {
  author: SafeUser;
}

export interface IStorage {
  // users
  getUser(id: number): Promise<SafeUser | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, patch: Partial<Pick<User, "bio" | "avatarHue" | "avatarUrl">>): Promise<SafeUser | undefined>;

  // stories
  listStories(category?: StoryCategory, search?: string, viewerId?: number, opts?: { tag?: string; authorId?: number; limit?: number; offset?: number }): Promise<StoryWithRelations[]>;
  countStories(category?: StoryCategory, search?: string, opts?: { tag?: string; authorId?: number }): Promise<number>;
  getStory(id: number, viewerId?: number): Promise<StoryWithRelations | undefined>;
  listStoriesByAuthor(userId: number): Promise<StoryWithRelations[]>;
  createStory(userId: number, data: InsertStory): Promise<Story>;
  deleteStory(id: number, userId: number): Promise<boolean>;

  // parts
  listParts(storyId: number): Promise<PartWithAuthor[]>;
  addPart(storyId: number, userId: number, content: string): Promise<StoryPart>;
  canAddPart(storyId: number, userId: number): Promise<{ allowed: boolean; reason?: string }>;
  updatePart(partId: number, userId: number, content: string): Promise<StoryPart | undefined>;
  deletePart(partId: number, userId: number): Promise<boolean>;

  // likes
  toggleLike(storyId: number, userId: number): Promise<{ liked: boolean; count: number }>;
  likeCount(storyId: number): Promise<number>;

  // comments
  listComments(storyId: number): Promise<CommentWithAuthor[]>;
  addComment(storyId: number, userId: number, content: string): Promise<Comment>;
  updateComment(commentId: number, userId: number, content: string): Promise<Comment | undefined>;
  deleteComment(commentId: number, userId: number): Promise<boolean>;

  // notifications
  listNotifications(userId: number): Promise<NotificationWithActor[]>;
  unreadCount(userId: number): Promise<number>;
  markAllRead(userId: number): Promise<void>;
  notify(opts: { userId: number; actorId?: number; type: string; storyId?: number; partId?: number; message: string }): void;

  // reports
  createReport(reporterId: number, targetType: ReportTarget, targetId: number, reason: string): Promise<Report>;
  listReports(): Promise<ReportWithReporter[]>;
  updateReportStatus(id: number, status: string): Promise<Report | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ---------- USERS ----------
  async getUser(id: number): Promise<SafeUser | undefined> {
    return stripPassword(db.select().from(users).where(eq(users.id, id)).get());
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const row = db.select().from(users).where(eq(users.email, email)).get();
    return row as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const row = db.select().from(users).where(eq(users.username, username)).get();
    return row as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    return db.insert(users).values(user).returning().get();
  }

  async updateUser(id: number, patch: Partial<Pick<User, "bio" | "avatarHue" | "avatarUrl">>): Promise<SafeUser | undefined> {
    const clean = { ...patch };
    if (clean.avatarUrl === "") clean.avatarUrl = null;
    const updated = db.update(users).set(clean).where(eq(users.id, id)).returning().get();
    return stripPassword(updated);
  }

  // ---------- STORIES ----------
  private attachRelations(rows: Story[], viewerId?: number): StoryWithRelations[] {
    return rows.map((story) => {
      const author = stripPassword(
        db.select().from(users).where(eq(users.id, story.authorId)).get()
      )!;
      const partCount = db
        .select()
        .from(storyParts)
        .where(eq(storyParts.storyId, story.id))
        .all().length;
      const likeRows = db.select().from(likes).where(eq(likes.storyId, story.id)).all();
      const commentCount = db
        .select()
        .from(comments)
        .where(eq(comments.storyId, story.id))
        .all().length;
      const likedByMe = viewerId
        ? likeRows.some((l) => l.userId === viewerId)
        : false;
      return {
        ...story,
        author,
        partCount,
        likeCount: likeRows.length,
        commentCount,
        likedByMe,
      };
    });
  }

  async listStories(category?: StoryCategory, search?: string, viewerId?: number, opts?: { tag?: string; authorId?: number; limit?: number; offset?: number }): Promise<StoryWithRelations[]> {
    let rows = (category
      ? db.select().from(stories).where(eq(stories.category, category)).orderBy(desc(stories.updatedAt)).all()
      : db.select().from(stories).orderBy(desc(stories.updatedAt)).all()
    ) as Story[];

    if (opts?.authorId) rows = rows.filter((s) => s.authorId === opts.authorId);
    if (opts?.tag) {
      const t = opts.tag.toLowerCase();
      rows = rows.filter((s) => parseTagsLocal(s.tags).some((x) => x.toLowerCase() === t));
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.synopsis.toLowerCase().includes(q) ||
          parseTagsLocal(s.tags).some((x) => x.toLowerCase().includes(q))
      );
    }
    const limit = opts?.limit ?? 12;
    const offset = opts?.offset ?? 0;
    const paged = rows.slice(offset, offset + limit);
    return this.attachRelations(paged, viewerId);
  }

  async countStories(category?: StoryCategory, search?: string, opts?: { tag?: string; authorId?: number }): Promise<number> {
    let rows = (category
      ? db.select().from(stories).where(eq(stories.category, category)).all()
      : db.select().from(stories).all()
    ) as Story[];
    if (opts?.authorId) rows = rows.filter((s) => s.authorId === opts.authorId);
    if (opts?.tag) {
      const t = opts.tag.toLowerCase();
      rows = rows.filter((s) => parseTagsLocal(s.tags).some((x) => x.toLowerCase() === t));
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) => s.title.toLowerCase().includes(q) || s.synopsis.toLowerCase().includes(q)
      );
    }
    return rows.length;
  }

  async getStory(id: number, viewerId?: number): Promise<StoryWithRelations | undefined> {
    const row = db.select().from(stories).where(eq(stories.id, id)).get() as Story | undefined;
    if (!row) return undefined;
    return this.attachRelations([row], viewerId)[0];
  }

  async listStoriesByAuthor(userId: number): Promise<StoryWithRelations[]> {
    const rows = db
      .select()
      .from(stories)
      .where(eq(stories.authorId, userId))
      .orderBy(desc(stories.updatedAt))
      .all() as Story[];
    return this.attachRelations(rows, userId);
  }

  async createStory(userId: number, data: InsertStory): Promise<Story> {
    const tagsJson = JSON.stringify(data.tags ?? []);
    return db
      .insert(stories)
      .values({
        title: data.title,
        synopsis: data.synopsis,
        category: data.category,
        authorId: userId,
        status: "open",
        tags: tagsJson,
        accentHue: data.accentHue ?? 190,
        isMature: data.isMature ?? false,
      })
      .returning()
      .get();
  }

  async deleteStory(id: number, userId: number): Promise<boolean> {
    const story = db.select().from(stories).where(eq(stories.id, id)).get() as Story | undefined;
    if (!story || story.authorId !== userId) return false;
    // remove dependent rows
    db.delete(likes).where(eq(likes.storyId, id)).run();
    db.delete(comments).where(eq(comments.storyId, id)).run();
    db.delete(storyParts).where(eq(storyParts.storyId, id)).run();
    db.delete(stories).where(eq(stories.id, id)).run();
    return true;
  }

  // ---------- PARTS ----------
  async listParts(storyId: number): Promise<PartWithAuthor[]> {
    const rows = db
      .select()
      .from(storyParts)
      .where(eq(storyParts.storyId, storyId))
      .orderBy(storyParts.order)
      .all() as StoryPart[];
    return rows.map((p) => ({
      ...p,
      author: stripPassword(db.select().from(users).where(eq(users.id, p.authorId)).get())!,
    }));
  }

  async addPart(storyId: number, userId: number, content: string): Promise<StoryPart> {
    const existing = db
      .select()
      .from(storyParts)
      .where(eq(storyParts.storyId, storyId))
      .orderBy(desc(storyParts.order))
      .all() as StoryPart[];
    const nextOrder = existing.length ? existing[0].order + 1 : 0;

    const part = db
      .insert(storyParts)
      .values({ storyId, authorId: userId, content, order: nextOrder })
      .returning()
      .get();

    // update story status + timestamp
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get() as Story | undefined;
    if (story) {
      db.update(stories)
        .set({ updatedAt: new Date().toISOString(), status: story.status === "open" ? "ongoing" : story.status })
        .where(eq(stories.id, storyId))
        .run();
      // notify story author (if not the contributor)
      if (story.authorId !== userId) {
        this.notify({
          userId: story.authorId,
          actorId: userId,
          type: "part",
          storyId,
          partId: part.id,
          message: `Alguém adicionou um trecho à sua história "${story.title}"`,
        });
      }
    }
    return part;
  }

  async canAddPart(storyId: number, userId: number): Promise<{ allowed: boolean; reason?: string }> {
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get() as Story | undefined;
    if (!story) return { allowed: false, reason: "História não encontrada" };
    if (story.status === "completed")
      return { allowed: false, reason: "Esta história já foi concluída" };

    // Non-collaborative stories: only the author can add chapters.
    if (story.category !== "roleplay") {
      if (story.authorId !== userId)
        return { allowed: false, reason: "Apenas o autor pode adicionar capítulos a esta história." };
      return { allowed: true };
    }

    // Roleplay: turn-based — you can't write twice in a row.
    const parts = db
      .select()
      .from(storyParts)
      .where(eq(storyParts.storyId, storyId))
      .orderBy(desc(storyParts.order))
      .all() as StoryPart[];

    if (parts.length > 0 && parts[0].authorId === userId) {
      return {
        allowed: false,
        reason: "Você acabou de escrever. Espere outra pessoa continuar a história.",
      };
    }
    return { allowed: true };
  }

  // ---------- LIKES ----------
  async toggleLike(storyId: number, userId: number): Promise<{ liked: boolean; count: number }> {
    const existing = db
      .select()
      .from(likes)
      .where(and(eq(likes.storyId, storyId), eq(likes.userId, userId)))
      .get();
    if (existing) {
      db.delete(likes).where(eq(likes.id, existing.id)).run();
    } else {
      db.insert(likes).values({ storyId, userId }).run();
      // notify story author
      const story = db.select().from(stories).where(eq(stories.id, storyId)).get() as Story | undefined;
      if (story && story.authorId !== userId) {
        this.notify({
          userId: story.authorId,
          actorId: userId,
          type: "like",
          storyId,
          message: `Alguém curtiu sua história "${story.title}"`,
        });
      }
    }
    const count = db.select().from(likes).where(eq(likes.storyId, storyId)).all().length;
    return { liked: !existing, count };
  }

  async likeCount(storyId: number): Promise<number> {
    return db.select().from(likes).where(eq(likes.storyId, storyId)).all().length;
  }

  // ---------- COMMENTS ----------
  async listComments(storyId: number): Promise<CommentWithAuthor[]> {
    const rows = db
      .select()
      .from(comments)
      .where(eq(comments.storyId, storyId))
      .orderBy(desc(comments.createdAt))
      .all() as Comment[];
    return rows.map((c) => ({
      ...c,
      author: stripPassword(db.select().from(users).where(eq(users.id, c.authorId)).get())!,
    }));
  }

  async addComment(storyId: number, userId: number, content: string): Promise<Comment> {
    const created = db
      .insert(comments)
      .values({ storyId, authorId: userId, content })
      .returning()
      .get();
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get() as Story | undefined;
    if (story && story.authorId !== userId) {
      this.notify({
        userId: story.authorId,
        actorId: userId,
        type: "comment",
        storyId,
        message: `Alguém comentou na sua história "${story.title}"`,
      });
    }
    return created;
  }

  async updateComment(commentId: number, userId: number, content: string): Promise<Comment | undefined> {
    const existing = db.select().from(comments).where(eq(comments.id, commentId)).get() as Comment | undefined;
    if (!existing || existing.authorId !== userId) return undefined;
    return db.update(comments).set({ content }).where(eq(comments.id, commentId)).returning().get();
  }

  async deleteComment(commentId: number, userId: number): Promise<boolean> {
    const existing = db.select().from(comments).where(eq(comments.id, commentId)).get() as Comment | undefined;
    if (!existing || existing.authorId !== userId) return false;
    db.delete(comments).where(eq(comments.id, commentId)).run();
    return true;
  }

  // ---------- PART edit/delete ----------
  async updatePart(partId: number, userId: number, content: string): Promise<StoryPart | undefined> {
    const existing = db.select().from(storyParts).where(eq(storyParts.id, partId)).get() as StoryPart | undefined;
    if (!existing || existing.authorId !== userId) return undefined;
    return db.update(storyParts).set({ content }).where(eq(storyParts.id, partId)).returning().get();
  }

  async deletePart(partId: number, userId: number): Promise<boolean> {
    const existing = db.select().from(storyParts).where(eq(storyParts.id, partId)).get() as StoryPart | undefined;
    if (!existing || existing.authorId !== userId) return false;
    db.delete(storyParts).where(eq(storyParts.id, partId)).run();
    // re-number order for the story
    const parts = db.select().from(storyParts).where(eq(storyParts.storyId, existing.storyId)).orderBy(storyParts.order).all() as StoryPart[];
 parts.forEach((p, i) => {
      db.update(storyParts).set({ order: i }).where(eq(storyParts.id, p.id)).run();
    });
    return true;
  }

  // ---------- NOTIFICATIONS ----------
  notify(opts: { userId: number; actorId?: number; type: string; storyId?: number; partId?: number; message: string }): void {
    try {
      db.insert(notifications)
        .values({
          userId: opts.userId,
          actorId: opts.actorId ?? null,
          type: opts.type,
          storyId: opts.storyId ?? null,
          partId: opts.partId ?? null,
          message: opts.message,
          read: false,
        })
        .run();
    } catch (e) {
      // never let notifications break the main operation
      console.error("notify failed", e);
    }
  }

  async listNotifications(userId: number): Promise<NotificationWithActor[]> {
    const rows = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30)
      .all() as Notification[];
    return rows.map((n) => {
      const actor = n.actorId ? stripPassword(db.select().from(users).where(eq(users.id, n.actorId)).get()) ?? null : null;
      const story = n.storyId ? (db.select().from(stories).where(eq(stories.id, n.storyId)).get() as Story | undefined) : undefined;
      return { ...n, actor, storyTitle: story?.title ?? null };
    });
  }

  async unreadCount(userId: number): Promise<number> {
    return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false))).all().length;
  }

  async markAllRead(userId: number): Promise<void> {
    db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false))).run();
  }

  // ---------- REPORTS ----------
  async createReport(reporterId: number, targetType: ReportTarget, targetId: number, reason: string): Promise<Report> {
    const created = db
      .insert(reports)
      .values({ reporterId, targetType, targetId, reason })
      .returning()
      .get();
    return created;
  }

  async listReports(): Promise<ReportWithReporter[]> {
    const rows = db.select().from(reports).orderBy(desc(reports.createdAt)).all() as Report[];
    return rows.map((r) => ({
      ...r,
      reporter: stripPassword(db.select().from(users).where(eq(users.id, r.reporterId)).get())!,
    }));
  }

  async updateReportStatus(id: number, status: string): Promise<Report | undefined> {
    return db.update(reports).set({ status }).where(eq(reports.id, id)).returning().get();
  }
}

export const storage = new DatabaseStorage();
