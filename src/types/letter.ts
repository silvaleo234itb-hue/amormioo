export type EntranceAnimation =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'paper-unfold'
  | 'typewriter'
  | 'word-by-word';

export type BackgroundTheme =
  | 'cream-paper'
  | 'soft-rose'
  | 'starlit-night'
  | 'floral-garden'
  | 'vintage-warm'
  | 'pure-elegance';

export type ParticleType = 'hearts' | 'petals' | 'stars' | 'sparkles' | 'none';
export type ParticleIntensity = 'gentle' | 'medium' | 'high' | 'none';
export type ImageStyle = 'polaroid' | 'polaroid-tilted' | 'rounded' | 'frame' | 'collage';
export type ImagePosition = 'top' | 'side-left' | 'side-right' | 'polaroid-tilted' | 'gallery';
export type PostType = 'letter' | 'photo_post' | 'quote_card' | 'memory';

export interface LetterImage {
  id: string;
  url: string;
  caption?: string;
  style?: ImageStyle;
}

export interface LetterComment {
  id: string;
  author: string;
  text: string;
  date: string;
  isAuthor?: boolean;
}

export interface TimelineMemory {
  id: string;
  date: string;
  title: string;
  caption: string;
  photoUrl: string;
  author: string;
  location?: string;
  authorUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoupleUser {
  name: string;
  password: string;
  avatarEmoji?: string;
}

export interface Letter {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  date: string;
  highlightPhrase?: string;
  content: string;
  signature: string;
  emoji: string;
  images: LetterImage[];
  videoUrl?: string;
  animationIn: EntranceAnimation;
  backgroundTheme: BackgroundTheme;
  particleType: ParticleType;
  particleIntensity: ParticleIntensity;
  imagePosition: ImagePosition;
  published: boolean;
  isFinalLetter?: boolean;
  postType?: PostType;
  category?: string;
  location?: string;
  likesCount?: number;
  likedBy?: string[];
  isLiked?: boolean;
  comments?: LetterComment[];
  isPinned?: boolean;
  authorId?: 'he' | 'she';
  authorName?: string;
  recipientName?: string;
  authorUid?: string;
  updatedAt?: string;
}

export interface AlbumConfig {
  recipientName: string;
  senderName: string;
  coverTitle: string;
  coverSubtitle: string;
  coverButtonText: string;
  adminPassword: string;
  musicEnabled: boolean;
  musicVolume: number;
  relationshipStartDate?: string;
  heUser?: CoupleUser;
  sheUser?: CoupleUser;
  memories?: TimelineMemory[];
  authorizedEmails?: string[];
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  type: 'new_letter' | 'new_memory' | 'new_comment' | 'new_like';
  title: string;
  message: string;
  timestamp: string;
  targetId?: string;
  targetView?: 'letters' | 'timeline';
  read?: boolean;
  icon?: string;
}
