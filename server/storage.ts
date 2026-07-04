import {
  users,
  stories,
  storyParts,
  likes,
  comments,
  notifications,
  reports,
  ratings,
  characters,
  quests,
  questParticipants,
  questPosts,
  questArguments,
  forumTopics,
  forumPosts,
  moderationFlags,
  storyCategories,
  type StoryCategory,
  type ModerationTarget,
  type ModerationClass,
  type ModerationFlagStatus,
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
  Rating,
  Character,
  Quest,
  QuestParticipant,
  QuestPost,
  QuestArgument,
  InsertCharacter,
  InsertQuest,
  InsertParticipant,
  InsertQuestPost,
  InsertArgument,
  QuestStatus,
  ForumTopic,
  ForumPost,
  InsertForumTopic,
  InsertForumPost,
  ModerationFlag,
  ModerationResult,
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
  ratingAvg: number | null;
  ratingTotal: number;
  myRating: number | null;
}

export interface PartWithAuthor extends StoryPart {
  author: SafeUser;
}

export interface CommentWithAuthor extends Comment {
  author: SafeUser;
}

// ---------- Taverna relation types ----------
export interface QuestWithRelations extends Quest {
  gm: SafeUser;
  slotsFilled: number;
  postCount: number;
  myParticipation: QuestParticipantWithRelations | null;
}

export interface QuestParticipantWithRelations extends QuestParticipant {
  user: SafeUser;
  character: Character;
}

export interface QuestPostWithRelations extends QuestPost {
  author: SafeUser;
  character: Character | null;
  arguments: QuestArgumentWithRelations[];
}

export interface QuestArgumentWithRelations extends QuestArgument {
  author: SafeUser;
}

// ---------- Bosque / Moderation relation types ----------
export interface ForumTopicWithRelations extends ForumTopic {
  author: SafeUser;
}

export interface ForumPostWithAuthor extends ForumPost {
  author: SafeUser;
  children: ForumPostWithAuthor[];
}

export interface ModerationFlagWithRelations extends ModerationFlag {
  resolver: SafeUser | null;
  snippet: string;
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
  addAiPart(storyId: number, content: string): Promise<StoryPart>;
  canAiAddPart(storyId: number): Promise<{ allowed: boolean; reason?: string }>;
  getOrCreateAiUser(): Promise<User>;

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

  // ratings
  rateStory(storyId: number, userId: number, score: number): Promise<Rating>;
  removeRating(storyId: number, userId: number): Promise<boolean>;

  // ---------- Taverna: characters ----------
  listCharacters(userId: number): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(userId: number, data: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, userId: number, data: Partial<InsertCharacter>): Promise<Character | undefined>;
  deleteCharacter(id: number, userId: number): Promise<boolean>;
  countCharacters(userId: number): Promise<number>;

  // ---------- Taverna: quests ----------
  listQuests(opts?: { status?: QuestStatus; search?: string; gmId?: number; limit?: number; offset?: number }): Promise<QuestWithRelations[]>;
  countQuests(opts?: { status?: QuestStatus; search?: string; gmId?: number }): Promise<number>;
  getQuest(id: number, viewerId?: number): Promise<QuestWithRelations | undefined>;
  createQuest(gmId: number, data: InsertQuest): Promise<Quest>;
  updateQuestStatus(id: number, gmId: number, status: QuestStatus): Promise<Quest | undefined>;
  deleteQuest(id: number, gmId: number): Promise<boolean>;

  // ---------- Taverna: participants ----------
  listParticipants(questId: number): Promise<QuestParticipantWithRelations[]>;
  joinQuest(questId: number, userId: number, data: InsertParticipant): Promise<QuestParticipant>;
  isParticipant(questId: number, userId: number): Promise<boolean>;
  removeParticipant(questId: number, userId: number, gmId: number): Promise<boolean>;

  // ---------- Taverna: posts ----------
  listQuestPosts(questId: number, viewerId?: number): Promise<QuestPostWithRelations[]>;
  addQuestPost(questId: number, userId: number, data: InsertQuestPost): Promise<QuestPost>;
  addQuestRevision(questId: number, userId: number, originalPostId: number, data: InsertQuestPost): Promise<QuestPost>;
  removeQuestPost(postId: number, gmId: number, reason: string): Promise<QuestPost | undefined>;
  approveQuestPost(postId: number, gmId: number): Promise<QuestPost | undefined>;

  // ---------- Taverna: arguments ----------
  listArgumentsForPost(postId: number): Promise<QuestArgumentWithRelations[]>;
  addArgument(postId: number, userId: number, content: string): Promise<QuestArgument>;
  resolveArgument(argumentId: number, gmId: number, accepted: boolean, note?: string): Promise<QuestArgument | undefined>;

  // ---------- Bosque: forum ----------
  listForumTopics(opts?: { search?: string; limit?: number; offset?: number }): Promise<ForumTopicWithRelations[]>;
  countForumTopics(search?: string): Promise<number>;
  getForumTopic(id: number): Promise<ForumTopicWithRelations | undefined>;
  createForumTopic(userId: number, data: InsertForumTopic): Promise<ForumTopic>;
  listForumPosts(topicId: number): Promise<ForumPostWithAuthor[]>;
  addForumPost(topicId: number, userId: number, data: InsertForumPost): Promise<ForumPost>;
  closeForumTopic(id: number, userId: number): Promise<ForumTopic | undefined>;

  // ---------- Moderation flags ----------
  createModerationFlag(target: ModerationTarget, targetId: number, result: ModerationResult): Promise<ModerationFlag>;
  listModerationFilters(status?: ModerationFlagStatus): Promise<ModerationFlagWithRelations[]>;
  resolveModerationFlag(id: number, resolverId: number, status: ModerationFlagStatus, note?: string): Promise<ModerationFlag | undefined>;
  getModerationSnippet(target: ModerationTarget, targetId: number): string;
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
      const ratingRows = db.select().from(ratings).where(eq(ratings.storyId, story.id)).all() as Rating[];
      const ratingTotal = ratingRows.length;
      const ratingAvg = ratingTotal
        ? Math.round((ratingRows.reduce((s, r) => s + r.score, 0) / ratingTotal) * 10) / 10
        : null;
      const myRating = viewerId
        ? ratingRows.find((r) => r.userId === viewerId)?.score ?? null
        : null;
      return {
        ...story,
        author,
        partCount,
        likeCount: likeRows.length,
        commentCount,
        likedByMe,
        ratingAvg,
        ratingTotal,
        myRating,
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
        aiEnabled: data.aiEnabled ?? true,
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
    db.delete(ratings).where(eq(ratings.storyId, id)).run();
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

  // ---------- AI PARTICIPATION ----------
  async getOrCreateAiUser(): Promise<User> {
    const existing = db.select().from(users).where(eq(users.username, "narrador_ia")).get() as User | undefined;
    if (existing) return existing;
    // create a dedicated bot account for AI-generated parts (transparency)
    return db
      .insert(users)
      .values({
        username: "narrador_ia",
        email: "ia@contae.local",
        password: "__ai__",
        birthDate: "2000-01-01",
        bio: "Co-narrador automático. Escreve trechos quando convidado.",
        avatarHue: 280,
      })
      .returning()
      .get();
  }

  async canAiAddPart(storyId: number): Promise<{ allowed: boolean; reason?: string }> {
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get() as Story | undefined;
    if (!story) return { allowed: false, reason: "História não encontrada" };
    if (!story.aiEnabled) return { allowed: false, reason: "A IA não está habilitada nesta história." };
    if (story.status === "completed") return { allowed: false, reason: "Esta história já foi concluída" };
    const aiUser = await this.getOrCreateAiUser();
    const parts = db
      .select()
      .from(storyParts)
      .where(eq(storyParts.storyId, storyId))
      .orderBy(desc(storyParts.order))
      .all() as StoryPart[];
    // enforce intercalation: the AI never writes twice in a row
    if (parts.length > 0 && parts[0].authorId === aiUser.id) {
      return { allowed: false, reason: "A IA acabou de escrever. Agora é a vez de uma pessoa." };
    }
    return { allowed: true };
  }

  async addAiPart(storyId: number, content: string): Promise<StoryPart> {
    const aiUser = await this.getOrCreateAiUser();
    const existing = db
      .select()
      .from(storyParts)
      .where(eq(storyParts.storyId, storyId))
      .orderBy(desc(storyParts.order))
      .all() as StoryPart[];
    const nextOrder = existing.length ? existing[0].order + 1 : 0;

    const part = db
      .insert(storyParts)
      .values({ storyId, authorId: aiUser.id, content, order: nextOrder, isAi: true })
      .returning()
      .get();

    const story = db.select().from(stories).where(eq(stories.id, storyId)).get() as Story | undefined;
    if (story) {
      db.update(stories)
        .set({ updatedAt: new Date().toISOString(), status: story.status === "open" ? "ongoing" : story.status })
        .where(eq(stories.id, storyId))
        .run();
      if (story.authorId !== aiUser.id) {
        this.notify({
          userId: story.authorId,
          actorId: aiUser.id,
          type: "part",
          storyId,
          partId: part.id,
          message: `A IA adicionou um trecho à sua história "${story.title}"`,
        });
      }
    }
    return part;
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

  // ---------- RATINGS ----------
  async rateStory(storyId: number, userId: number, score: number): Promise<Rating> {
    const existing = db
      .select()
      .from(ratings)
      .where(and(eq(ratings.storyId, storyId), eq(ratings.userId, userId)))
      .get() as Rating | undefined;
    if (existing) {
      return db.update(ratings).set({ score }).where(eq(ratings.id, existing.id)).returning().get();
    }
    return db.insert(ratings).values({ storyId, userId, score }).returning().get();
  }

  async removeRating(storyId: number, userId: number): Promise<boolean> {
    const existing = db
      .select()
      .from(ratings)
      .where(and(eq(ratings.storyId, storyId), eq(ratings.userId, userId)))
      .get() as Rating | undefined;
    if (!existing) return false;
    db.delete(ratings).where(eq(ratings.id, existing.id)).run();
    return true;
  }

  // ============================ TAVERNA ============================

  // ---------- CHARACTERS ----------
  async listCharacters(userId: number): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.userId, userId)).orderBy(desc(characters.updatedAt)).all() as Character[];
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    return db.select().from(characters).where(eq(characters.id, id)).get() as Character | undefined;
  }

  async countCharacters(userId: number): Promise<number> {
    return db.select().from(characters).where(eq(characters.userId, userId)).all().length;
  }

  async createCharacter(userId: number, data: InsertCharacter): Promise<Character> {
    return db.insert(characters).values({ userId, name: data.name, concept: data.concept }).returning().get();
  }

  async updateCharacter(id: number, userId: number, data: Partial<InsertCharacter>): Promise<Character | undefined> {
    const own = db.select().from(characters).where(eq(characters.id, id)).get() as Character | undefined;
    if (!own || own.userId !== userId) return undefined;
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.concept !== undefined) patch.concept = data.concept;
    return db.update(characters).set(patch).where(eq(characters.id, id)).returning().get() as Character;
  }

  async deleteCharacter(id: number, userId: number): Promise<boolean> {
    const own = db.select().from(characters).where(eq(characters.id, id)).get() as Character | undefined;
    if (!own || own.userId !== userId) return false;
    db.delete(characters).where(eq(characters.id, id)).run();
    return true;
  }

  // ---------- QUESTS ----------
  private attachQuestRelations(rows: Quest[], viewerId?: number): QuestWithRelations[] {
    return rows.map((q) => {
      const gm = stripPassword(db.select().from(users).where(eq(users.id, q.gmId)).get())!;
      const participants = db.select().from(questParticipants).where(eq(questParticipants.questId, q.id)).all() as QuestParticipant[];
      const slotsFilled = participants.filter((p) => p.status === "active").length;
      const postCount = db.select().from(questPosts).where(and(eq(questPosts.questId, q.id), eq(questPosts.status, "active"))).all().length;
      let myParticipation: QuestParticipantWithRelations | null = null;
      if (viewerId) {
        const mine = participants.find((p) => p.userId === viewerId);
        if (mine) {
          const char = db.select().from(characters).where(eq(characters.id, mine.characterId)).get() as Character;
          myParticipation = { ...mine, user: stripPassword(db.select().from(users).where(eq(users.id, mine.userId)).get())!, character: char };
        }
      }
      return { ...q, gm, slotsFilled, postCount, myParticipation };
    });
  }

  async listQuests(opts?: { status?: QuestStatus; search?: string; gmId?: number; limit?: number; offset?: number }): Promise<QuestWithRelations[]> {
    let rows = db.select().from(quests).orderBy(desc(quests.updatedAt)).all() as Quest[];
    if (opts?.status) rows = rows.filter((q) => q.status === opts.status);
    if (opts?.gmId) rows = rows.filter((q) => q.gmId === opts.gmId);
    if (opts?.search) {
      const s = opts.search.toLowerCase();
      rows = rows.filter((q) => q.title.toLowerCase().includes(s) || q.seeking.toLowerCase().includes(s) || q.setting.toLowerCase().includes(s));
    }
    const limit = opts?.limit ?? 24;
    const offset = opts?.offset ?? 0;
    rows = rows.slice(offset, offset + limit);
    return this.attachQuestRelations(rows, undefined);
  }

  async countQuests(opts?: { status?: QuestStatus; search?: string; gmId?: number }): Promise<number> {
    let rows = db.select().from(quests).all() as Quest[];
    if (opts?.status) rows = rows.filter((q) => q.status === opts.status);
    if (opts?.gmId) rows = rows.filter((q) => q.gmId === opts.gmId);
    if (opts?.search) {
      const s = opts.search.toLowerCase();
      rows = rows.filter((q) => q.title.toLowerCase().includes(s) || q.seeking.toLowerCase().includes(s) || q.setting.toLowerCase().includes(s));
    }
    return rows.length;
  }

  async getQuest(id: number, viewerId?: number): Promise<QuestWithRelations | undefined> {
    const row = db.select().from(quests).where(eq(quests.id, id)).get() as Quest | undefined;
    if (!row) return undefined;
    return this.attachQuestRelations([row], viewerId)[0];
  }

  async createQuest(gmId: number, data: InsertQuest): Promise<Quest> {
    return db.insert(quests).values({ gmId, ...data }).returning().get();
  }

  async updateQuestStatus(id: number, gmId: number, status: QuestStatus): Promise<Quest | undefined> {
    const own = db.select().from(quests).where(eq(quests.id, id)).get() as Quest | undefined;
    if (!own || own.gmId !== gmId) return undefined;
    return db.update(quests).set({ status, updatedAt: new Date().toISOString() }).where(eq(quests.id, id)).returning().get() as Quest;
  }

  async deleteQuest(id: number, gmId: number): Promise<boolean> {
    const own = db.select().from(quests).where(eq(quests.id, id)).get() as Quest | undefined;
    if (!own || own.gmId !== gmId) return false;
    db.delete(questArguments).where(sql`post_id IN (SELECT id FROM quest_posts WHERE quest_id = ${id})`).run();
    db.delete(questPosts).where(eq(questPosts.questId, id)).run();
    db.delete(questParticipants).where(eq(questParticipants.questId, id)).run();
    db.delete(quests).where(eq(quests.id, id)).run();
    return true;
  }

  // ---------- PARTICIPANTS ----------
  async listParticipants(questId: number): Promise<QuestParticipantWithRelations[]> {
    const rows = db.select().from(questParticipants).where(eq(questParticipants.questId, questId)).orderBy(questParticipants.joinedAt).all() as QuestParticipant[];
    return rows.map((p) => {
      const user = stripPassword(db.select().from(users).where(eq(users.id, p.userId)).get())!;
      const character = db.select().from(characters).where(eq(characters.id, p.characterId)).get() as Character;
      return { ...p, user, character };
    });
  }

  async joinQuest(questId: number, userId: number, data: InsertParticipant): Promise<QuestParticipant> {
    // verify the character belongs to the user
    const char = db.select().from(characters).where(eq(characters.id, data.characterId)).get() as Character | undefined;
    if (!char || char.userId !== userId) throw new Error("Ficha inválida");
    const quest = db.select().from(quests).where(eq(quests.id, questId)).get() as Quest | undefined;
    if (!quest) throw new Error("Quest não encontrado");
    if (quest.status === "closed" || quest.status === "completed") throw new Error("Este quest não aceita mais entradas");
    const existing = db.select().from(questParticipants).where(and(eq(questParticipants.questId, questId), eq(questParticipants.userId, userId))).get() as QuestParticipant | undefined;
    if (existing) throw new Error("Você já entrou neste quest");
    const activeCount = db.select().from(questParticipants).where(eq(questParticipants.questId, questId)).all().filter((p) => p.status === "active").length;
    if (activeCount >= quest.slotsTotal) throw new Error("As vagas deste quest já foram preenchidas");
    const part = db.insert(questParticipants).values({ questId, userId, characterId: data.characterId, intro: data.intro }).returning().get();
    if (quest.gmId !== userId) {
      this.notify({ userId: quest.gmId, actorId: userId, type: "part", storyId: questId, message: `Alguém entrou no seu quest "${quest.title}"` });
    }
    return part;
  }

  async isParticipant(questId: number, userId: number): Promise<boolean> {
    const row = db.select().from(questParticipants).where(and(eq(questParticipants.questId, questId), eq(questParticipants.userId, userId))).get() as QuestParticipant | undefined;
    return !!row && row.status === "active";
  }

  async removeParticipant(questId: number, userId: number, gmId: number): Promise<boolean> {
    const quest = db.select().from(quests).where(eq(quests.id, questId)).get() as Quest | undefined;
    if (!quest || quest.gmId !== gmId) return false;
    const part = db.select().from(questParticipants).where(and(eq(questParticipants.questId, questId), eq(questParticipants.userId, userId))).get() as QuestParticipant | undefined;
    if (!part) return false;
    db.update(questParticipants).set({ status: "removed" }).where(eq(questParticipants.id, part.id)).run();
    return true;
  }

  // ---------- QUEST POSTS ----------
  async listQuestPosts(questId: number, viewerId?: number): Promise<QuestPostWithRelations[]> {
    let rows = db.select().from(questPosts).where(eq(questPosts.questId, questId)).orderBy(questPosts.order).all() as QuestPost[];
    // pending revisions only visible to the author and the GM
    const quest = db.select().from(quests).where(eq(quests.id, questId)).get() as Quest | undefined;
    const isGm = viewerId !== undefined && quest?.gmId === viewerId;
    rows = rows.filter((p) => {
      if (p.status !== "pending") return true;
      return isGm || p.authorId === viewerId;
    });
    return rows.map((p) => {
      const author = stripPassword(db.select().from(users).where(eq(users.id, p.authorId)).get())!;
      const character = p.characterId ? (db.select().from(characters).where(eq(characters.id, p.characterId)).get() as Character) : null;
      const args = db.select().from(questArguments).where(eq(questArguments.postId, p.id)).orderBy(questArguments.createdAt).all() as QuestArgument[];
      const argumentsWithAuthor = args.map((a) => ({ ...a, author: stripPassword(db.select().from(users).where(eq(users.id, a.authorId)).get())! }));
      return { ...p, author, character, arguments: argumentsWithAuthor };
    });
  }

  private nextQuestPostOrder(questId: number): number {
    const rows = db.select().from(questPosts).where(eq(questPosts.questId, questId)).orderBy(desc(questPosts.order)).all() as QuestPost[];
    return rows.length ? rows[0].order + 1 : 0;
  }

  async addQuestPost(questId: number, userId: number, data: InsertQuestPost): Promise<QuestPost> {
    const quest = db.select().from(quests).where(eq(quests.id, questId)).get() as Quest | undefined;
    if (!quest) throw new Error("Quest não encontrado");
    if (quest.status === "closed") throw new Error("Este quest está encerrado");
    const isGm = quest.gmId === userId;
    // GM may post as narration (characterId null) or as their own character; players must be active participants
    if (!isGm) {
      const ok = await this.isParticipant(questId, userId);
      if (!ok) throw new Error("Você não é participante ativo deste quest");
    }
    // if a characterId is provided, it must belong to the author
    if (data.characterId !== null && data.characterId !== undefined) {
      const char = db.select().from(characters).where(eq(characters.id, data.characterId)).get() as Character | undefined;
      if (!char || char.userId !== userId) throw new Error("Ficha inválida para este autor");
    }
    const order = this.nextQuestPostOrder(questId);
    const post = db.insert(questPosts).values({ questId, authorId: userId, characterId: data.characterId ?? null, content: data.content, order }).returning().get();
    if (quest.status === "open") {
      db.update(quests).set({ status: "ongoing", updatedAt: new Date().toISOString() }).where(eq(quests.id, questId)).run();
    } else {
      db.update(quests).set({ updatedAt: new Date().toISOString() }).where(eq(quests.id, questId)).run();
    }
    return post;
  }

  async addQuestRevision(questId: number, userId: number, originalPostId: number, data: InsertQuestPost): Promise<QuestPost> {
    const original = db.select().from(questPosts).where(eq(questPosts.id, originalPostId)).get() as QuestPost | undefined;
    if (!original || original.questId !== questId) throw new Error("Trecho original não encontrado");
    if (original.authorId !== userId) throw new Error("Só o autor pode reescrever seu trecho");
    if (data.characterId !== null && data.characterId !== undefined) {
      const char = db.select().from(characters).where(eq(characters.id, data.characterId)).get() as Character | undefined;
      if (!char || char.userId !== userId) throw new Error("Ficha inválida para este autor");
    }
    const order = this.nextQuestPostOrder(questId);
    return db.insert(questPosts).values({
      questId,
      authorId: userId,
      characterId: data.characterId ?? original.characterId,
      content: data.content,
      order,
      status: "pending",
      replacedById: originalPostId,
    }).returning().get();
  }

  async removeQuestPost(postId: number, gmId: number, reason: string): Promise<QuestPost | undefined> {
    const post = db.select().from(questPosts).where(eq(questPosts.id, postId)).get() as QuestPost | undefined;
    if (!post) return undefined;
    const quest = db.select().from(quests).where(eq(quests.id, post.questId)).get() as Quest | undefined;
    if (!quest || quest.gmId !== gmId) return undefined;
    return db.update(questPosts).set({ status: "removed", removedReason: reason, removedById: gmId }).where(eq(questPosts.id, postId)).returning().get() as QuestPost;
  }

  async approveQuestPost(postId: number, gmId: number): Promise<QuestPost | undefined> {
    const post = db.select().from(questPosts).where(eq(questPosts.id, postId)).get() as QuestPost | undefined;
    if (!post || post.status !== "pending") return undefined;
    const quest = db.select().from(quests).where(eq(quests.id, post.questId)).get() as Quest | undefined;
    if (!quest || quest.gmId !== gmId) return undefined;
    return db.update(questPosts).set({ status: "active" }).where(eq(questPosts.id, postId)).returning().get() as QuestPost;
  }

  // ---------- ARGUMENTS ----------
  async listArgumentsForPost(postId: number): Promise<QuestArgumentWithRelations[]> {
    const rows = db.select().from(questArguments).where(eq(questArguments.postId, postId)).orderBy(questArguments.createdAt).all() as QuestArgument[];
    return rows.map((a) => ({ ...a, author: stripPassword(db.select().from(users).where(eq(users.id, a.authorId)).get())! }));
  }

  async addArgument(postId: number, userId: number, content: string): Promise<QuestArgument> {
    const post = db.select().from(questPosts).where(eq(questPosts.id, postId)).get() as QuestPost | undefined;
    if (!post) throw new Error("Trecho não encontrado");
    if (post.authorId !== userId) throw new Error("Só o autor do trecho pode argumentar");
    // reject if there is already a pending argument for this post by the same user
    const pending = db.select().from(questArguments).where(and(eq(questArguments.postId, postId), eq(questArguments.authorId, userId))).all() as QuestArgument[];
    if (pending.some((a) => a.status === "pending")) throw new Error("Você já tem um argumento aguardando resposta do GM");
    return db.insert(questArguments).values({ postId, authorId: userId, content }).returning().get();
  }

  async resolveArgument(argumentId: number, gmId: number, accepted: boolean, note?: string): Promise<QuestArgument | undefined> {
    const arg = db.select().from(questArguments).where(eq(questArguments.id, argumentId)).get() as QuestArgument | undefined;
    if (!arg || arg.status !== "pending") return undefined;
    const post = db.select().from(questPosts).where(eq(questPosts.id, arg.postId)).get() as QuestPost | undefined;
    if (!post) return undefined;
    const quest = db.select().from(quests).where(eq(quests.id, post.questId)).get() as Quest | undefined;
    if (!quest || quest.gmId !== gmId) return undefined;
    const updated = db.update(questArguments).set({ status: accepted ? "accepted" : "rejected", gmNote: note ?? null }).where(eq(questArguments.id, argumentId)).returning().get() as QuestArgument;
    if (accepted) {
      // restore the original post
      db.update(questPosts).set({ status: "active", removedReason: null, removedById: null }).where(eq(questPosts.id, post.id)).run();
    }
    return updated;
  }

  // ---------- BOSQUE: FORUM TOPICS ----------
  async listForumTopics(opts?: { search?: string; limit?: number; offset?: number }): Promise<ForumTopicWithRelations[]> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    let q = db.select().from(forumTopics).$dynamic();
    if (opts?.search) {
      q = q.where(like(forumTopics.title, `%${opts.search}%`));
    }
    const rows = q.orderBy(desc(forumTopics.updatedAt)).limit(limit).offset(offset).all() as ForumTopic[];
    return rows.map((t) => ({ ...t, author: stripPassword(db.select().from(users).where(eq(users.id, t.authorId)).get())! }));
  }

  async countForumTopics(search?: string): Promise<number> {
    let q = db.select({ c: sql`count(*)` }).from(forumTopics).$dynamic();
    if (search) q = q.where(like(forumTopics.title, `%${search}%`));
    const row = q.get() as { c: number } | undefined;
    return row?.c ?? 0;
  }

  async getForumTopic(id: number): Promise<ForumTopicWithRelations | undefined> {
    const t = db.select().from(forumTopics).where(eq(forumTopics.id, id)).get() as ForumTopic | undefined;
    if (!t) return undefined;
    return { ...t, author: stripPassword(db.select().from(users).where(eq(users.id, t.authorId)).get())! };
  }

  async createForumTopic(userId: number, data: InsertForumTopic): Promise<ForumTopic> {
    return db.insert(forumTopics).values({
      title: data.title,
      body: data.body,
      authorId: userId,
      isMature: data.isMature ?? false,
      accentHue: data.accentHue ?? 270,
    }).returning().get();
  }

  async closeForumTopic(id: number, userId: number): Promise<ForumTopic | undefined> {
    const t = db.select().from(forumTopics).where(eq(forumTopics.id, id)).get() as ForumTopic | undefined;
    if (!t || t.authorId !== userId) return undefined;
    return db.update(forumTopics).set({ status: "closed", updatedAt: new Date().toISOString() }).where(eq(forumTopics.id, id)).returning().get() as ForumTopic;
  }

  // ---------- BOSQUE: FORUM POSTS (threaded) ----------
  async listForumPosts(topicId: number): Promise<ForumPostWithAuthor[]> {
    const rows = db.select().from(forumPosts).where(eq(forumPosts.topicId, topicId)).orderBy(forumPosts.createdAt).all() as ForumPost[];
    const withAuthor = rows.map((p) => ({ ...p, author: stripPassword(db.select().from(users).where(eq(users.id, p.authorId)).get())!, children: [] as ForumPostWithAuthor[] }));
    // build a tree via parentId
    const byId = new Map<number, ForumPostWithAuthor>();
    withAuthor.forEach((p) => byId.set(p.id, p));
    const roots: ForumPostWithAuthor[] = [];
    withAuthor.forEach((p) => {
      if (p.parentId && byId.has(p.parentId)) {
        byId.get(p.parentId)!.children.push(p);
      } else {
        roots.push(p);
      }
    });
    return roots;
  }

  async addForumPost(topicId: number, userId: number, data: InsertForumPost): Promise<ForumPost> {
    const topic = db.select().from(forumTopics).where(eq(forumTopics.id, topicId)).get() as ForumTopic | undefined;
    if (!topic) throw new Error("Tópico não encontrado");
    if (topic.status === "closed") throw new Error("Este tópico está encerrado");
    if (data.parentId) {
      const parent = db.select().from(forumPosts).where(eq(forumPosts.id, data.parentId)).get() as ForumPost | undefined;
      if (!parent || parent.topicId !== topicId) throw new Error("Resposta pai inválida");
    }
    const post = db.insert(forumPosts).values({
      topicId,
      authorId: userId,
      parentId: data.parentId ?? null,
      content: data.content,
    }).returning().get();
    db.update(forumTopics).set({ replyCount: (topic.replyCount ?? 0) + 1, updatedAt: new Date().toISOString() }).where(eq(forumTopics.id, topicId)).run();
    return post;
  }

  // ---------- MODERATION FLAGS ----------
  async createModerationFlag(target: ModerationTarget, targetId: number, result: ModerationResult): Promise<ModerationFlag> {
    // avoid duplicate open flags for the same target
    const existing = db.select().from(moderationFlags).where(and(eq(moderationFlags.targetType, target), eq(moderationFlags.targetId, targetId))).all() as ModerationFlag[];
    if (existing.some((f) => f.status === "open")) return existing.find((f) => f.status === "open")!;
    return db.insert(moderationFlags).values({
      targetType: target,
      targetId,
      classification: result.classification,
      reason: result.reason,
      status: "open",
    }).returning().get();
  }

  async listModerationFilters(status?: ModerationFlagStatus): Promise<ModerationFlagWithRelations[]> {
    let q = db.select().from(moderationFlags).$dynamic();
    if (status) q = q.where(eq(moderationFlags.status, status));
    const rows = q.orderBy(desc(moderationFlags.createdAt)).all() as ModerationFlag[];
    return rows.map((f) => ({
      ...f,
      resolver: f.resolvedById ? stripPassword(db.select().from(users).where(eq(users.id, f.resolvedById)).get()) ?? null : null,
      snippet: this.getModerationSnippet(f.targetType, f.targetId),
    }));
  }

  async resolveModerationFlag(id: number, resolverId: number, status: ModerationFlagStatus, note?: string): Promise<ModerationFlag | undefined> {
    const f = db.select().from(moderationFlags).where(eq(moderationFlags.id, id)).get() as ModerationFlag | undefined;
    if (!f || f.status !== "open") return undefined;
    return db.update(moderationFlags).set({
      status,
      resolvedById: resolverId,
      resolutionNote: note ?? null,
      resolvedAt: new Date().toISOString(),
    }).where(eq(moderationFlags.id, id)).returning().get() as ModerationFlag;
  }

  getModerationSnippet(target: ModerationTarget, targetId: number): string {
    let text: string | undefined;
    switch (target) {
      case "story": {
        const s = db.select().from(stories).where(eq(stories.id, targetId)).get();
        text = s ? `${s.title} — ${s.synopsis}` : undefined;
        break;
      }
      case "part": {
        const p = db.select().from(storyParts).where(eq(storyParts.id, targetId)).get();
        text = p?.content;
        break;
      }
      case "comment": {
        const c = db.select().from(comments).where(eq(comments.id, targetId)).get();
        text = c?.content;
        break;
      }
      case "forum_topic": {
        const t = db.select().from(forumTopics).where(eq(forumTopics.id, targetId)).get();
        text = t ? `${t.title} — ${t.body}` : undefined;
        break;
      }
      case "forum_post": {
        const p = db.select().from(forumPosts).where(eq(forumPosts.id, targetId)).get();
        text = p?.content;
        break;
      }
      case "character": {
        const c = db.select().from(characters).where(eq(characters.id, targetId)).get();
        text = c ? `${c.name} — ${c.concept}` : undefined;
        break;
      }
      case "quest": {
        const q2 = db.select().from(quests).where(eq(quests.id, targetId)).get();
        text = q2 ? `${q2.title} — ${q2.brief}` : undefined;
        break;
      }
      case "quest_post": {
        const p = db.select().from(questPosts).where(eq(questPosts.id, targetId)).get();
        text = p?.content;
        break;
      }
    }
    if (!text) return "(conteúdo não encontrado)";
    return text.length > 220 ? text.slice(0, 220) + "…" : text;
  }
}

export const storage = new DatabaseStorage();
