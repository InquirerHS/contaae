// Frontend type mirrors of backend shapes

export interface SafeUser {
  id: number;
  username: string;
  email: string;
  birthDate: string;
  bio: string | null;
  avatarHue: number | null;
  avatarUrl: string | null;
  createdAt: string;
}

export type StoryCategory = "real" | "creepy" | "roleplay";
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
  partCount: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
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

export type ReportTarget = "story" | "part" | "comment";
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
