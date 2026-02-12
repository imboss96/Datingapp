
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  isPremium: boolean;
  role: UserRole;
  location: string;
  interests: string[];
  coins: number; // Virtual currency for global usage
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isFlagged: boolean;
  flagReason?: string;
  isEditedByModerator?: boolean;
}

export interface Chat {
  id: string;
  participants: [string, string];
  messages: Message[];
  lastUpdated: number;
}

export interface Report {
  id: string;
  reportedId: string;
  reporterId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  type: 'PROFILE' | 'CHAT';
  targetId: string; // Message ID or Profile ID
}
