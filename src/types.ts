export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  location?: string;
  partnershipTier?: string;
  createdAt: string;
}

export type PledgeStatus = 'pending' | 'partial' | 'fulfilled' | 'overdue';

export interface Pledge {
  id: string;
  pledgeNumber: string; // e.g. JMG-2026-0001
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  currency: string;
  purpose: string;
  notes?: string;
  pledgeDate: string;
  dueDate: string;
  fulfilledAmount: number;
  status: PledgeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  id: string;
  receiptNumber: string; // e.g. RCP-2026-0001
  pledgeId: string;
  pledgeNumber: string;
  userId: string;
  userName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  recordedBy: 'mshirika' | 'admin';
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  supportingDetails: string;
  recordedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface UserSummary {
  totalPledged: number;
  totalFulfilled: number;
  outstandingBalance: number;
  activePledgesCount: number;
  fulfilledPledgesCount: number;
  contributionsCount: number;
  pledgesCount?: number;
  fulfillmentRate?: number;
  approachingDueCount: number;
  overdueCount: number;
}

export interface AdminFinancialSummary {
  totalPartnersCount: number;
  totalPledgedAmount: number;
  totalFulfilledAmount: number;
  totalOutstandingAmount: number;
  totalExpensesAmount: number;
  ministryNetBalance: number;
  totalPledgesCount: number;
  totalContributionsCount: number;
  totalExpensesCount: number;
  activeRemindersCount: number;
}

export interface ReminderNotification {
  pledgeId: string;
  pledgeNumber: string;
  purpose: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
  daysRemaining: number;
  type: 'approaching' | 'today' | 'overdue';
  message: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  pledgeId?: string;
  pledgeNumber?: string;
  title: string;
  message: string;
  channelUsed?: 'in_app' | 'whatsapp' | 'sms' | 'email' | 'all';
  senderName: string;
  amount?: number;
  remainingAmount?: number;
  dueDate?: string;
  metadata?: {
    pledgeId?: string;
    pledgeNumber?: string;
    remainingAmount?: number;
    dueDate?: string;
    senderName?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
}

export interface MinistryNewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: 'mradi' | 'injili' | 'matangazo' | 'huduma_jamii' | 'tangazo_muhimu';
  badge: string;
  progressPercent: number; // 0 to 100
  targetAmount?: number;
  currentAmount?: number;
  location?: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  priority: 'high' | 'normal' | 'urgent';
  isActive: boolean;
  publishDate: string;
  date?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMinistryStats {
  ministryNetBalance: number;
  totalFulfilledAmount: number;
  totalExpensesAmount: number;
  totalPledgedAmount: number;
  totalPartnersCount: number;
  currency: string;
  lastUpdated: string;
}

export interface TestimonialItem {
  id: string;
  partnerName: string;
  location: string;
  tier: string;
  category: 'biashara' | 'ujenzi' | 'uponyaji' | 'agano' | 'familia' | 'huduma';
  categoryLabel: string;
  quote: string;
  fullTestimony: string;
  scripture: string;
  date: string;
  verified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

