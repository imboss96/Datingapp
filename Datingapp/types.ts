
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum NotificationType {
  MATCH = 'MATCH',
  MESSAGE = 'MESSAGE',
  SUPER_LIKE = 'SUPER_LIKE',
  PROFILE_VIEW = 'PROFILE_VIEW',
  REPORT = 'REPORT'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface VerificationInfo {
  status: VerificationStatus;
  idType?: string; // e.g., 'PASSPORT', 'DRIVERS_LICENSE'
  verifiedAt?: number;
  expiresAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  fromUserId?: string;
  read: boolean;
  timestamp: number;
  actionUrl?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email?: string;
  age: number;
  bio: string;
  images: string[];
  isPremium: boolean;
  role: UserRole;
  location: string;
  coordinates?: Coordinates; // For distance-based search
  interests: string[];
  coins: number; // Virtual currency for global usage
  verification: VerificationInfo;
  blockedUsers: string[]; // User IDs that this user has blocked
  reportedUsers: string[]; // User IDs that this user has reported
  // Legal & Verification
  termsOfServiceAccepted?: boolean;
  privacyPolicyAccepted?: boolean;
  cookiePolicyAccepted?: boolean;
  legalAcceptanceDate?: Date;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  isPhotoVerified?: boolean;
  photoVerifiedAt?: Date;
  // Account Status
  suspended?: boolean;
  banned?: boolean;
}

export interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'pdf' | 'file' | 'audio';
  name: string;
  size: number;
  mimetype: string;
  duration?: number; // for videos/audio in seconds
  width?: number; // for images/videos
  height?: number; // for images/videos
  thumbnail?: string; // thumbnail URL for videos
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  timestamp: number;
  isFlagged: boolean;
  flagReason?: string;
  isEditedByModerator?: boolean;
  isEdited?: boolean; // User edited the message
  editedAt?: number; // Timestamp when message was edited
  originalText?: string; // Store original text for edit history
  isRead?: boolean; // Read receipt
  readAt?: number; // Timestamp when message was read
  media?: MediaFile; // Media file attached to message
}

export interface Chat {
  id: string;
  participants: [string, string];
  messages: Message[];
  lastUpdated: number;
  isBlocked?: boolean; // If one party blocked the other
  requestStatus?: 'pending' | 'accepted' | 'blocked';
  requestInitiator?: string;
  requestInitiatorFirstMessage?: boolean;
  blockedBy?: string[];
  isNewChat?: boolean;
  unreadCount?: number;
}

export interface Report {
  id: string;
  reportedId: string;
  reporterId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  type: 'PROFILE' | 'CHAT';
  targetId: string; // Message ID or Profile ID
  description?: string;
  evidence?: string[]; // URLs to evidence (screenshots, etc)
  createdAt: number;
}

export interface BlockedUser {
  id: string;
  userId: string; // Who did the blocking
  blockedUserId: string; // Who was blocked
  reason?: string;
  blockedAt: number;
}
