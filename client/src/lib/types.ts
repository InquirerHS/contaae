// Frontend type mirrors of backend shapes

export interface SafeUser {
  id: number;
  username: string;
  // presentes só para a própria conta (auth/me); payloads públicos não os incluem
  email?: string;
  birthDate?: string;
  bio: string | null;
  avatarHue: number | null;
  avatarUrl: string | null;
  isModerator?: boolean;
  createdAt: string;
}

export type StoryCategory = "real" | "roleplay";
export type StoryStatus = "open" | "ongoing" | "completed";

export interface StoryWithRelations {
  id: number;
  title: string;
  synopsis: string;
  category: StoryCategory;
  authorId: number;
  author: SafeUser;
  status: StoryStatus;
  tags: string;
  accentHue: number | null;
  isMature: boolean | null;
  aiEnabled: boolean | null;
  partCount: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  ratingAvg: number | null;
  ratingTotal: number;
  myRating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartWithAuthor {
  id: number;
  storyId: number;
  authorId: number;
  author: SafeUser;
  content: string;
  order: number;
  isAi: boolean;
  createdAt: string;
}

export interface CommentWithAuthor {
  id: number;
  storyId: number;
  authorId: number;
  author: SafeUser;
  content: string;
  createdAt: string;
}

export type NotificationType = "like" | "comment" | "part" | "report";

export interface AppNotification {
  id: number;
  userId: number;
  actorId: number | null;
  actor: SafeUser | null;
  type: NotificationType;
  storyId: number | null;
  partId: number | null;
  message: string;
  read: boolean;
  storyTitle: string | null;
  createdAt: string;
}

export type ReportTarget = "story" | "part" | "comment" | "forum_topic" | "forum_post" | "character" | "quest" | "quest_post";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface ReportWithReporter {
  id: number;
  reporterId: number;
  reporter: SafeUser;
  targetType: ReportTarget;
  targetId: number;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface PaginatedStories {
  items: StoryWithRelations[];
  page: number;
  pages: number;
  total: number;
}

// ============================ TAVERNA ============================

export interface Character {
  id: number;
  userId: number;
  name: string;
  concept: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestStatus = "open" | "ongoing" | "completed" | "closed";
export type ParticipantStatus = "active" | "removed";
export type QuestPostStatus = "active" | "removed" | "pending";
export type ArgumentStatus = "pending" | "accepted" | "rejected";

export interface QuestParticipantWithRelations {
  id: number;
  questId: number;
  userId: number;
  characterId: number;
  intro: string;
  status: ParticipantStatus;
  joinedAt: string;
  user: SafeUser;
  character: Character;
}

export interface QuestArgumentWithRelations {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  status: ArgumentStatus;
  gmNote: string | null;
  createdAt: string;
  author: SafeUser;
}

export interface QuestPostWithRelations {
  id: number;
  questId: number;
  authorId: number;
  characterId: number | null;
  content: string;
  order: number;
  status: QuestPostStatus;
  removedReason: string | null;
  removedById: number | null;
  replacedById: number | null;
  createdAt: string;
  author: SafeUser;
  character: Character | null;
  arguments: QuestArgumentWithRelations[];
}

export interface QuestWithRelations {
  id: number;
  title: string;
  gmId: number;
  setting: string;
  situation: string;
  brief: string;
  slotsTotal: number;
  seeking: string;
  isMature: boolean | null;
  status: QuestStatus;
  accentHue: number | null;
  createdAt: string;
  updatedAt: string;
  gm: SafeUser;
  slotsFilled: number;
  postCount: number;
  myParticipation: QuestParticipantWithRelations | null;
}

// ---------- Bosque / Moderação ----------
export type ForumTopicStatus = "open" | "closed";

export interface ForumTopicWithRelations {
  id: number;
  title: string;
  body: string;
  authorId: number;
  isMature: boolean | null;
  accentHue: number | null;
  status: ForumTopicStatus;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  author: SafeUser;
}

export interface ForumPostWithAuthor {
  id: number;
  topicId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  author: SafeUser;
  children: ForumPostWithAuthor[];
}

export type ModerationClass = "ok" | "borderline" | "violation";
export type ModerationFlagStatus = "open" | "kept" | "hidden" | "removed";
export type ModerationTarget =
  | "story" | "part" | "comment" | "forum_topic" | "forum_post"
  | "character" | "quest" | "quest_post";

export interface ModerationFlagWithRelations {
  id: number;
  targetType: ModerationTarget;
  targetId: number;
  classification: ModerationClass;
  reason: string;
  status: ModerationFlagStatus;
  resolvedById: number | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolver: SafeUser | null;
  snippet: string;
}
