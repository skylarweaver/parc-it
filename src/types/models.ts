// Shared interfaces for office requests, group members, and admins

export interface OfficeRequest {
  id: string;
  emoji: string;
  description: string;
  created_at: string;
  deleted: boolean;
  group_members: any; // You can further type this if needed
  signature?: string | null;
  doxxed_member_id?: string | null;
}

export interface GroupMember {
  id: string;
  github_username: string;
  avatar_url: string;
  public_key: string;
}

export interface Admin {
  id: string;
  github_username: string;
  public_key?: string; // Some usages omit public_key
} 

export interface Upvote {
  id: string;
  request_id: string;
  nullifier: string;
  created_at: string;
} 