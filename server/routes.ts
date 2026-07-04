import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginUserSchema,
  insertStorySchema,
  insertStoryPartSchema,
  insertCommentSchema,
  storyCategories,
  type StoryCategory,
} from "@shared/schema";
import { z } from "zod";
import crypto from "node:crypto";

// ---------- AUTH (token-based, in-memory) ----------
const tokens = new Map<string, number>(); // token -> userId

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}

function issueToken(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  tokens.set(token, userId);
  return token;
}

function getUserIdFromReq(req: Request): number | undefined {
  const header = req.headers["x-auth-token"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token) return undefined;
  return tokens.get(token);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }
  (req as any).userId = userId;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---------- AUTH ----------
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) return res.status(409).json({ message: "E-mail já cadastrado" });
      const existingName = await storage.getUserByUsername(data.username);
      if (existingName) return res.status(409).json({ message: "Nome de usuário já em uso" });

      const created = await storage.createUser({
        ...data,
        password: hashPassword(data.password),
      });
      const token = issueToken(created.id);
      const { password, ...safe } = created;
      res.status(201).json({ token, user: safe });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const data = loginUserSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user || !verifyPassword(data.password, user.password)) {
        return res.status(401).json({ message: "E-mail ou senha incorretos" });
      }
      const token = issueToken(user.id);
      const { password, ...safe } = user;
      res.json({ token, user: safe });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser((req as any).userId);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  });

  app.patch("/api/auth/me", requireAuth, async (req, res, next) => {
    try {
      const patch = z
        .object({ bio: z.string().max(300).optional(), avatarHue: z.number().min(0).max(360).optional() })
        .parse(req.body);
      const updated = await storage.updateUser((req as any).userId, patch);
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  // ---------- STORIES ----------
  app.get("/api/stories", async (req, res, next) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const validCategory =
        category && (storyCategories as readonly string[]).includes(category)
          ? (category as StoryCategory)
          : undefined;
      const viewerId = getUserIdFromReq(req);
      const list = await storage.listStories(validCategory, search, viewerId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/stories/featured", async (_req, res, next) => {
    try {
      const all = await storage.listStories(undefined, undefined, getUserIdFromReq(_req));
      // pick up to 6 most liked
      const featured = [...all].sort((a, b) => b.likeCount - a.likeCount).slice(0, 6);
      res.json(featured);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/stories/mine", requireAuth, async (req, res, next) => {
    try {
      const list = await storage.listStoriesByAuthor((req as any).userId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/stories", requireAuth, async (req, res, next) => {
    try {
      const data = insertStorySchema.parse(req.body);
      const story = await storage.createStory((req as any).userId, data);
      res.status(201).json(story);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/stories/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const story = await storage.getStory(id, getUserIdFromReq(req));
      if (!story) return res.status(404).json({ message: "História não encontrada" });
      res.json(story);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/stories/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const ok = await storage.deleteStory(id, (req as any).userId);
      if (!ok) return res.status(403).json({ message: "Não foi possível remover esta história" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ---------- PARTS ----------
  app.get("/api/stories/:id/parts", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const parts = await storage.listParts(id);
      res.json(parts);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/stories/:id/parts", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = (req as any).userId as number;
      const check = await storage.canAddPart(id, userId);
      if (!check.allowed) return res.status(403).json({ message: check.reason });
      const data = insertStoryPartSchema.parse({ ...req.body, storyId: id });
      const part = await storage.addPart(id, userId, data.content);
      res.status(201).json(part);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/stories/:id/can-contribute", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const check = await storage.canAddPart(id, (req as any).userId);
      res.json(check);
    } catch (e) {
      next(e);
    }
  });

  // ---------- LIKES ----------
  app.post("/api/stories/:id/like", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await storage.toggleLike(id, (req as any).userId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // ---------- COMMENTS ----------
  app.get("/api/stories/:id/comments", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const list = await storage.listComments(id);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/stories/:id/comments", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertCommentSchema.parse({ ...req.body, storyId: id });
      const comment = await storage.addComment(id, (req as any).userId, data.content);
      res.status(201).json(comment);
    } catch (e) {
      next(e);
    }
  });

  return httpServer;
}
