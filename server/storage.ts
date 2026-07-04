import {
  users,
  stories,
  storyParts,
  likes,
  comments,
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
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, ne } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
// foreign keys so deletes cascade cleanly handled in app layer
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

function stripPassword(u: User | undefined): SafeUser | undefined {
  if (!u) return undefined;
  const { password, ...safe } = u;
  return safe;
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
  updateUser(id: number, patch: Partial<Pick<User, "bio" | "avatarHue">>): Promise<SafeUser | undefined>;

  // stories
  listStories(category?: StoryCategory, search?: string, viewerId?: number): Promise<StoryWithRelations[]>;
  getStory(id: number, viewerId?: number): Promise<StoryWithRelations | undefined>;
  listStoriesByAuthor(userId: number): Promise<StoryWithRelations[]>;
  createStory(userId: number, data: InsertStory): Promise<Story>;
  deleteStory(id: number, userId: number): Promise<boolean>;

  // parts
  listParts(storyId: number): Promise<PartWithAuthor[]>;
  addPart(storyId: number, userId: number, content: string): Promise<StoryPart>;
  canAddPart(storyId: number, userId: number): Promise<{ allowed: boolean; reason?: string }>;

  // likes
  toggleLike(storyId: number, userId: number): Promise<{ liked: boolean; count: number }>;
  likeCount(storyId: number): Promise<number>;

  // comments
  listComments(storyId: number): Promise<CommentWithAuthor[]>;
  addComment(storyId: number, userId: number, content: string): Promise<Comment>;
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

  async updateUser(id: number, patch: Partial<Pick<User, "bio" | "avatarHue">>): Promise<SafeUser | undefined> {
    const updated = db.update(users).set(patch).where(eq(users.id, id)).returning().get();
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

  async listStories(category?: StoryCategory, search?: string, viewerId?: number): Promise<StoryWithRelations[]> {
    const rows = (category
      ? db.select().from(stories).where(eq(stories.category, category)).orderBy(desc(stories.updatedAt)).all()
      : db.select().from(stories).orderBy(desc(stories.updatedAt)).all()
    ) as Story[];

    const filtered = search
      ? rows.filter(
          (s) =>
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.synopsis.toLowerCase().includes(search.toLowerCase())
        )
      : rows;
    return this.attachRelations(filtered, viewerId);
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
    return db
      .insert(comments)
      .values({ storyId, authorId: userId, content })
      .returning()
      .get();
  }
}

export const storage = new DatabaseStorage();
