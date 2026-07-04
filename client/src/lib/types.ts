// Frontend type mirrors of backend shapes

export interface SafeUser {
  id: number;
  username: string;
  email: string;
  birthDate: string;
  bio: string | null;
  avatarHue: number | null;
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
