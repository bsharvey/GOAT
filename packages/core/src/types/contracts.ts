// Smart contract and collaboration types

export type ContractStatus = "draft" | "pending" | "active" | "completed" | "disputed";

export interface RoyaltySplit {
  party: string;
  role: string; // writer, producer, performer, publisher
  percentage: number;
  walletAddress?: string;
}

export interface SmartContract {
  id: string;
  title: string;
  parties: string[];
  royaltySplits: RoyaltySplit[];
  status: ContractStatus;
  terms: string;
  createdAt: Date;
  deployedAt?: Date;
  transactions: ContractTransaction[];
}

export interface ContractTransaction {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  from: string;
  to: string;
  timestamp: Date;
  txHash?: string;
}

export interface CollaborationProject {
  id: string;
  name: string;
  description: string;
  members: CollaborationMember[];
  files: ProjectFile[];
  status: "active" | "archived" | "completed";
  createdAt: Date;
}

export interface CollaborationMember {
  userId: string;
  name: string;
  role: "owner" | "admin" | "contributor" | "viewer";
  joinedAt: Date;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  version: number;
  uploadedBy: string;
  uploadedAt: Date;
  size: number;
}
