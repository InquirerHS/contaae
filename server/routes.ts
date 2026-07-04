import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginUserSchema,
  insertStorySchema,
  insertStoryPartSchema,
  insertCommentSchema,
  insertReportSchema,
  insertRatingSchema,
  insertCharacterSchema,
  insertQuestSchema,
  insertParticipantSchema,
  insertQuestPostSchema,
  insertArgumentSchema,
  insertForumTopicSchema,
  insertForumPostSchema,
  storyCategories,
  reportTargets,
  questStatuses,
  moderationTargets,
  moderationFlagStatuses,
  type StoryCategory,
  type ReportTarget,
  type QuestStatus,
  type ModerationTarget,
  type ModerationFlagStatus,
} from "@shared/schema";
import { generateNextPart } from "./ai";
import { classifyContent, shouldFlag } from "./moderation";
import { z } from "zod";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

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

// ---------- IA DE MODERAÇÃO (pós-publicação, não bloqueante) ----------
// Roda em background após criar conteúdo; nunca impede a publicação.
function runModeration(target: ModerationTarget, targetId: number, content: string) {
  classifyContent(target, content)
    .then((result) => {
      if (shouldFlag(result)) {
        return storage.createModerationFlag(target, targetId, result);
      }
    })
    .catch((e) => console.warn("[moderation] falha ao classificar:", (e as Error)?.message));
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
        .object({
          bio: z.string().max(300).optional(),
          avatarHue: z.number().min(0).max(360).optional(),
          avatarUrl: z.string().max(500).optional(),
        })
        .parse(req.body);
      const updated = await storage.updateUser((req as any).userId, patch);
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  // avatar upload (raw image body)
  app.post("/api/auth/me/avatar", requireAuth, express.raw({ type: "*/*", limit: "5mb" }), async (req, res, next) => {
    try {
      const userId = (req as any).userId as number;
      const contentType = req.headers["content-type"] || "";
      const raw = req.body as Buffer | undefined;
      if (!raw || !raw.length) return res.status(400).json({ message: "Arquivo vazio" });
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const uploadsDir = path.resolve(process.cwd(), "client/public/uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${userId}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), raw);
      const url = `/uploads/${filename}`;
      const updated = await storage.updateUser(userId, { avatarUrl: url });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  // public profile by username
  app.get("/api/users/:username", async (req, res, next) => {
    try {
      const u = await storage.getUserByUsername(req.params.username);
      if (!u) return res.status(404).json({ message: "Usuário não encontrado" });
      const { password, ...safe } = u;
      const list = await storage.listStoriesByAuthor(u.id);
      res.json({ user: safe, stories: list });
    } catch (e) {
      next(e);
    }
  });

  // ---------- STORIES ----------
  app.get("/api/stories", async (req, res, next) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const tag = req.query.tag as string | undefined;
      const authorId = req.query.authorId ? Number(req.query.authorId) : undefined;
      const page = Math.max(1, Number(req.query.page || 1));
      const validCategory =
        category && (storyCategories as readonly string[]).includes(category)
          ? (category as StoryCategory)
          : undefined;
      const viewerId = getUserIdFromReq(req);
      const limit = 12;
      const list = await storage.listStories(validCategory, search, viewerId, {
        tag,
        authorId,
        limit,
        offset: (page - 1) * limit,
      });
      const total = await storage.countStories(validCategory, search, { tag, authorId });
      res.json({ items: list, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/stories/featured", async (_req, res, next) => {
    try {
      const all = await storage.listStories(undefined, undefined, getUserIdFromReq(_req), { limit: 100 });
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
      runModeration("story", story.id, `${story.title} — ${story.synopsis}`);
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
      runModeration("part", part.id, part.content);
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
      runModeration("comment", comment.id, comment.content);
      res.status(201).json(comment);
    } catch (e) {
      next(e);
    }
  });

  // edit a part (only its author)
  app.patch("/api/stories/:id/parts/:partId", requireAuth, async (req, res, next) => {
    try {
      const partId = parseInt(req.params.partId, 10);
      const { content } = z.object({ content: z.string().min(20).max(6000) }).parse(req.body);
      const updated = await storage.updatePart(partId, (req as any).userId, content);
      if (!updated) return res.status(403).json({ message: "Você só pode editar seus próprios trechos" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  // delete a part (only its author)
  app.delete("/api/stories/:id/parts/:partId", requireAuth, async (req, res, next) => {
    try {
      const partId = parseInt(req.params.partId, 10);
      const ok = await storage.deletePart(partId, (req as any).userId);
      if (!ok) return res.status(403).json({ message: "Você só pode remover seus próprios trechos" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // edit a comment (only its author)
  app.patch("/api/stories/:id/comments/:commentId", requireAuth, async (req, res, next) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      const { content } = z.object({ content: z.string().min(2).max(800) }).parse(req.body);
      const updated = await storage.updateComment(commentId, (req as any).userId, content);
      if (!updated) return res.status(403).json({ message: "Você só pode editar seus próprios comentários" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  // delete a comment (only its author)
  app.delete("/api/stories/:id/comments/:commentId", requireAuth, async (req, res, next) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      const ok = await storage.deleteComment(commentId, (req as any).userId);
      if (!ok) return res.status(403).json({ message: "Você só pode remover seus próprios comentários" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ---------- REPORTS ----------
  app.post("/api/reports", requireAuth, async (req, res, next) => {
    try {
      const data = insertReportSchema.parse(req.body);
      const report = await storage.createReport((req as any).userId, data.targetType, data.targetId, data.reason);
      res.status(201).json(report);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/reports", requireAuth, async (req, res, next) => {
    try {
      // simple "moderation" panel: any logged-in user can view reports
      const list = await storage.listReports();
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.patch("/api/reports/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = z.object({ status: z.enum(["open", "reviewing", "resolved", "dismissed"]) }).parse(req.body);
      const updated = await storage.updateReportStatus(id, status);
      if (!updated) return res.status(404).json({ message: "Denúncia não encontrada" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  // ---------- NOTIFICATIONS ----------
  app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const list = await storage.listNotifications((req as any).userId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/notifications/unread", requireAuth, async (req, res, next) => {
    try {
      const count = await storage.unreadCount((req as any).userId);
      res.json({ count });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res, next) => {
    try {
      await storage.markAllRead((req as any).userId);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ---------- AI PARTICIPATION ("Conte com a IA") ----------
  // any logged-in participant may invite the AI to write the next part
  app.post("/api/stories/:id/invite-ai", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const story = await storage.getStory(id);
      if (!story) return res.status(404).json({ message: "História não encontrada" });
      const check = await storage.canAiAddPart(id);
      if (!check.allowed) return res.status(403).json({ message: check.reason });
      const parts = await storage.listParts(id);
      const content = await generateNextPart({
        story: { title: story.title, synopsis: story.synopsis, category: story.category, tags: story.tags, isMature: story.isMature },
        parts: parts.map((p) => ({ content: p.content, isAi: p.isAi, order: p.order })),
      });
      const part = await storage.addAiPart(id, content);
      res.status(201).json(part);
    } catch (e: any) {
      res.status(502).json({ message: e?.message || "A IA não conseguiu gerar um trecho agora." });
    }
  });

  // ---------- RATINGS ----------
  app.post("/api/stories/:id/rate", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { score } = insertRatingSchema.pick({ score: true }).parse(req.body);
      // ensure the story exists
      const story = await storage.getStory(id);
      if (!story) return res.status(404).json({ message: "História não encontrada" });
      const rating = await storage.rateStory(id, (req as any).userId, score);
      res.json(rating);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/stories/:id/rate", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.removeRating(id, (req as any).userId);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ============================ TAVERNA ============================

  // ---------- CHARACTERS (fichas reutilizáveis, máx 2) ----------
  app.get("/api/characters", requireAuth, async (req, res, next) => {
    try {
      const list = await storage.listCharacters((req as any).userId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/characters", requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as number;
      const count = await storage.countCharacters(userId);
      if (count >= 2) return res.status(400).json({ message: "Você já tem o máximo de 2 fichas. Apague uma para criar outra." });
      const data = insertCharacterSchema.parse(req.body);
      const created = await storage.createCharacter(userId, data);
      runModeration("character", created.id, `${created.name} — ${created.concept}`);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  app.patch("/api/characters/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertCharacterSchema.partial().parse(req.body);
      const updated = await storage.updateCharacter(id, (req as any).userId, data);
      if (!updated) return res.status(403).json({ message: "Você só pode editar suas próprias fichas" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/characters/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const ok = await storage.deleteCharacter(id, (req as any).userId);
      if (!ok) return res.status(403).json({ message: "Você só pode remover suas próprias fichas" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ---------- QUESTS ----------
  app.get("/api/quests", async (req, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const validStatus = status && (questStatuses as readonly string[]).includes(status) ? (status as QuestStatus) : undefined;
      const list = await storage.listQuests({ status: validStatus, search });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/quests/mine", requireAuth, async (req, res, next) => {
    try {
      const list = await storage.listQuests({ gmId: (req as any).userId });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/quests", requireAuth, async (req, res, next) => {
    try {
      const data = insertQuestSchema.parse(req.body);
      const created = await storage.createQuest((req as any).userId, data);
      runModeration("quest", created.id, `${created.title} — ${created.setting} ${created.situation} ${created.brief}`);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/quests/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const quest = await storage.getQuest(id, getUserIdFromReq(req));
      if (!quest) return res.status(404).json({ message: "Quest não encontrado" });
      res.json(quest);
    } catch (e) {
      next(e);
    }
  });

  app.patch("/api/quests/:id/status", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = z.object({ status: z.enum(questStatuses) }).parse(req.body);
      const updated = await storage.updateQuestStatus(id, (req as any).userId, status);
      if (!updated) return res.status(403).json({ message: "Apenas o GM pode alterar o status do quest" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/quests/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const ok = await storage.deleteQuest(id, (req as any).userId);
      if (!ok) return res.status(403).json({ message: "Apenas o GM pode remover o quest" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ---------- PARTICIPANTS ----------
  app.get("/api/quests/:id/participants", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const list = await storage.listParticipants(id);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/quests/:id/join", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertParticipantSchema.parse(req.body);
      const part = await storage.joinQuest(id, (req as any).userId, data);
      res.status(201).json(part);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Não foi possível entrar no quest" });
    }
  });

  app.delete("/api/quests/:id/participants/:userId", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const targetUserId = parseInt(req.params.userId, 10);
      const ok = await storage.removeParticipant(id, targetUserId, (req as any).userId);
      if (!ok) return res.status(403).json({ message: "Apenas o GM pode remover participantes" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ---------- QUEST POSTS (narrativa) ----------
  app.get("/api/quests/:id/posts", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const list = await storage.listQuestPosts(id, getUserIdFromReq(req));
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/quests/:id/posts", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertQuestPostSchema.parse(req.body);
      const post = await storage.addQuestPost(id, (req as any).userId, data);
      runModeration("quest_post", post.id, post.content);
      res.status(201).json(post);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Não foi possível publicar o trecho" });
    }
  });

  // autor reescreve trecho removido → cria revisão pendente
  app.post("/api/quests/:id/posts/:postId/revise", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const postId = parseInt(req.params.postId, 10);
      const data = insertQuestPostSchema.parse(req.body);
      const post = await storage.addQuestRevision(id, (req as any).userId, postId, data);
      res.status(201).json(post);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Não foi possível enviar a revisão" });
    }
  });

  // GM remove um trecho com motivo
  app.delete("/api/quest-posts/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { reason } = z.object({ reason: z.string().min(3, "Explique o motivo da remoção").max(500) }).parse(req.body);
      const post = await storage.removeQuestPost(id, (req as any).userId, reason);
      if (!post) return res.status(403).json({ message: "Apenas o GM pode remover trechos" });
      res.json(post);
    } catch (e) {
      next(e);
    }
  });

  // GM aprova uma revisão pendente
  app.post("/api/quest-posts/:id/approve", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const post = await storage.approveQuestPost(id, (req as any).userId);
      if (!post) return res.status(403).json({ message: "Apenas o GM pode aprovar revisões" });
      res.json(post);
    } catch (e) {
      next(e);
    }
  });

  // ---------- ARGUMENTS ----------
  app.post("/api/quest-posts/:id/argue", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { content } = insertArgumentSchema.pick({ content: true }).parse(req.body);
      const arg = await storage.addArgument(id, (req as any).userId, content);
      res.status(201).json(arg);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Não foi possível enviar o argumento" });
    }
  });

  app.post("/api/quest-arguments/:id/resolve", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { accepted, note } = z.object({ accepted: z.boolean(), note: z.string().max(500).optional() }).parse(req.body);
      const arg = await storage.resolveArgument(id, (req as any).userId, accepted, note);
      if (!arg) return res.status(403).json({ message: "Apenas o GM pode resolver argumentos" });
      res.json(arg);
    } catch (e) {
      next(e);
    }
  });

  // ============================ BOSQUE ASSOMBRADO (fórum) ============================
  app.get("/api/forum/topics", async (req, res, next) => {
    try {
      const search = req.query.search as string | undefined;
      const list = await storage.listForumTopics({ search });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/forum/topics", requireAuth, async (req, res, next) => {
    try {
      const data = insertForumTopicSchema.parse(req.body);
      const topic = await storage.createForumTopic((req as any).userId, data);
      runModeration("forum_topic", topic.id, `${topic.title} — ${topic.body}`);
      res.status(201).json(topic);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/forum/topics/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const topic = await storage.getForumTopic(id);
      if (!topic) return res.status(404).json({ message: "Tópico não encontrado" });
      res.json(topic);
    } catch (e) {
      next(e);
    }
  });

  app.patch("/api/forum/topics/:id/close", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const topic = await storage.closeForumTopic(id, (req as any).userId);
      if (!topic) return res.status(403).json({ message: "Apenas o autor pode encerrar o tópico" });
      res.json(topic);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/forum/topics/:id/posts", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const list = await storage.listForumPosts(id);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/forum/topics/:id/posts", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertForumPostSchema.parse({ ...req.body, topicId: id });
      const post = await storage.addForumPost(id, (req as any).userId, data);
      runModeration("forum_post", post.id, post.content);
      res.status(201).json(post);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Não foi possível publicar a resposta" });
    }
  });

  // ============================ MODERAÇÃO (sinalizações da IA) ============================
  app.get("/api/moderation/flags", requireAuth, async (req, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const valid = status && (moderationFlagStatuses as readonly string[]).includes(status) ? (status as ModerationFlagStatus) : undefined;
      const list = await storage.listModerationFilters(valid);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.patch("/api/moderation/flags/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, note } = z.object({
        status: z.enum(moderationFlagStatuses),
        note: z.string().max(500).optional(),
      }).parse(req.body);
      const updated = await storage.resolveModerationFlag(id, (req as any).userId, status, note);
      if (!updated) return res.status(404).json({ message: "Sinalização não encontrada ou já resolvida" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  return httpServer;
}
