// Create a new component: components/GitHub/GitHubActivity.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { GitBranch, GitPullRequest, GitCommit, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface GitHubActivity {
  id: string;
  agentId: string;
  agentName: string;
  activity: string;
  details: any;
  timestamp: Date;
}

interface GitHubActivityProps {
  sessionId: string;
}

export default function GitHubActivity({ sessionId }: GitHubActivityProps) {
  const [activities, setActivities] = useState<GitHubActivity[]>([]);

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'branch_created': return <GitBranch size={16} className="text-[--color-discord-green]" />;
      case 'files_committed': return <GitCommit size={16} className="text-[--color-discord-accent]" />;
      case 'pr_created': return <GitPullRequest size={16} className="text-[--color-discord-yellow]" />;
      case 'issue_created': return <FileText size={16} className="text-[--color-discord-muted]" />;
      case 'pr_merged': return <CheckCircle size={16} className="text-[--color-discord-green]" />;
      case 'task_completed': return <CheckCircle size={16} className="text-[--color-discord-green]" />;
      default: return <AlertCircle size={16} className="text-[--color-discord-muted]" />;
    }
  };

  const formatActivity = (activity: GitHubActivity) => {
    const { activity: type, details, agentName } = activity;
    
    switch (type) {
      case 'branch_created':
        return `${agentName} created branch \`${details.branchName}\``;
      case 'files_committed':
        return `${agentName} committed ${details.fileCount} files`;
      case 'pr_created':
        return `${agentName} opened PR #${details.prNumber}`;
      case 'issue_created':
        return `${agentName} created issue #${details.issueNumber}`;
      case 'pr_merged':
        return `${agentName} merged PR #${details.prNumber}`;
      case 'task_completed':
        return `${agentName} completed "${details.taskTitle}"`;
      default:
        return `${agentName} performed ${type}`;
    }
  };

  // You can extend this to listen for GitHub activities via WebSocket
  useEffect(() => {
    // Mock data for now - replace with real WebSocket listener
    const mockActivities: GitHubActivity[] = [
      {
        id: '1',
        agentId: 'developer',
        agentName: 'Alex Developer',
        activity: 'branch_created',
        details: { branchName: 'feature/user-auth-123', taskTitle: 'User Authentication' },
        timestamp: new Date(Date.now() - 300000)
      },
      {
        id: '2',
        agentId: 'developer',
        agentName: 'Alex Developer',
        activity: 'files_committed',
        details: { fileCount: 3, files: ['auth.js', 'login.tsx', 'auth.test.js'] },
        timestamp: new Date(Date.now() - 180000)
      },
      {
        id: '3',
        agentId: 'developer',
        agentName: 'Alex Developer',
        activity: 'pr_created',
        details: { prNumber: 23, title: 'Add user authentication system' },
        timestamp: new Date(Date.now() - 60000)
      }
    ];
    
    setActivities(mockActivities);
  }, []);

  return (
    <div className="bg-[--color-discord-darker] rounded-lg p-4 mb-4">
      <h3 className="text-white font-medium mb-3 flex items-center gap-2">
        <GitBranch size={18} />
        Recent GitHub Activity
      </h3>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 p-2 rounded hover:bg-[--color-discord-light] transition-colors">
            {getActivityIcon(activity.activity)}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[--color-discord-text] truncate">
                {formatActivity(activity)}
              </p>
              <p className="text-xs text-[--color-discord-muted]">
                {new Date(activity.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <p className="text-sm text-[--color-discord-muted] italic text-center py-4">
            No recent GitHub activity
          </p>
        )}
      </div>
    </div>
  );
}