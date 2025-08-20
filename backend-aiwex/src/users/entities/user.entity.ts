export type UserRole = 
  | 'junior-developer'
  | 'senior-developer'
  | 'qa-engineer'
  | 'product-manager'
  | 'ui-ux-designer'
  | 'team-lead'
  | 'devops-engineer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  githubUsername: string;
  avatar?: string;
  department: string;
  level: number; // Experience level 1-10
  skills: string[];
  joinedAt: Date;
  stats: {
    tasksCompleted: number;
    prsCreated: number;
    prsReviewed: number;
    issuesCreated: number;
    points: number; // Gamification points
  };
}

export interface UserPermissions {
  canCreateIssue: boolean;
  canCreatePR: boolean;
  canReviewCode: boolean;
  canMergePR: boolean;
  canAssignTasks: boolean;
  canCreateSprint: boolean;
  canManageTeam: boolean;
  canDeployCode: boolean;
  canApproveDesign: boolean;
  canEditRequirements: boolean;
}

export const rolePermissions: Record<UserRole, UserPermissions> = {
  'junior-developer': {
    canCreateIssue: true,
    canCreatePR: true,
    canReviewCode: false,
    canMergePR: false,
    canAssignTasks: false,
    canCreateSprint: false,
    canManageTeam: false,
    canDeployCode: false,
    canApproveDesign: false,
    canEditRequirements: false,
  },
  'senior-developer': {
    canCreateIssue: true,
    canCreatePR: true,
    canReviewCode: true,
    canMergePR: true,
    canAssignTasks: true,
    canCreateSprint: false,
    canManageTeam: false,
    canDeployCode: false,
    canApproveDesign: false,
    canEditRequirements: false,
  },
  'qa-engineer': {
    canCreateIssue: true,
    canCreatePR: false,
    canReviewCode: true,
    canMergePR: false,
    canAssignTasks: false,
    canCreateSprint: false,
    canManageTeam: false,
    canDeployCode: false,
    canApproveDesign: false,
    canEditRequirements: true,
  },
  'product-manager': {
    canCreateIssue: true,
    canCreatePR: false,
    canReviewCode: false,
    canMergePR: false,
    canAssignTasks: true,
    canCreateSprint: true,
    canManageTeam: false,
    canDeployCode: false,
    canApproveDesign: false,
    canEditRequirements: true,
  },
  'ui-ux-designer': {
    canCreateIssue: true,
    canCreatePR: false,
    canReviewCode: true, // Only UI code
    canMergePR: false,
    canAssignTasks: false,
    canCreateSprint: false,
    canManageTeam: false,
    canDeployCode: false,
    canApproveDesign: true,
    canEditRequirements: false,
  },
  'team-lead': {
    canCreateIssue: true,
    canCreatePR: true,
    canReviewCode: true,
    canMergePR: true,
    canAssignTasks: true,
    canCreateSprint: true,
    canManageTeam: true,
    canDeployCode: true,
    canApproveDesign: true,
    canEditRequirements: true,
  },
  'devops-engineer': {
    canCreateIssue: true,
    canCreatePR: true,
    canReviewCode: true,
    canMergePR: true,
    canAssignTasks: false,
    canCreateSprint: false,
    canManageTeam: false,
    canDeployCode: true,
    canApproveDesign: false,
    canEditRequirements: false,
  },
};