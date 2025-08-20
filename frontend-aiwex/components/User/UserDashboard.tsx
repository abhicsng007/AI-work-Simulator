'use client';

import React from 'react';
import { Trophy, Target, GitPullRequest, CheckCircle, BookOpen, Award } from 'lucide-react';

interface UserDashboardProps {
  user: any;
  permissions: any;
  mentor?: any;
  learningPath: any[];
}

export default function UserDashboard({ user, permissions, mentor, learningPath }: UserDashboardProps) {
  const roleColors = {
    'junior-developer': 'bg-blue-500',
    'senior-developer': 'bg-purple-500',
    'qa-engineer': 'bg-green-500',
    'product-manager': 'bg-orange-500',
  };

  return (
    <div className="p-6">
      {/* User Profile Header */}
      <div className="bg-[--color-discord-darker] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${roleColors[user.role as keyof typeof roleColors]} flex items-center justify-center`}>
              <span className="text-2xl font-bold text-white">{user.name[0]}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-[--color-discord-muted]">{user.role.replace('-', ' ').toUpperCase()}</p>
              <div className="flex items-center gap-2 mt-1">
                <Award size={16} className="text-[--color-discord-accent]" />
                <span className="text-[--color-discord-accent]">Level {user.level}</span>
                <span className="text-[--color-discord-muted]">•</span>
                <span className="text-[--color-discord-text]">{user.stats.points} points</span>
              </div>
            </div>
          </div>
          
          {mentor && (
            <div className="bg-[--color-discord-light] rounded-lg p-4">
              <p className="text-sm text-[--color-discord-muted] mb-1">Your Mentor</p>
              <p className="text-white font-medium">{mentor.name}</p>
              <p className="text-xs text-[--color-discord-accent]">{mentor.role.replace('-', ' ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark]">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={20} className="text-[--color-discord-green]" />
            <span className="text-2xl font-bold text-white">{user.stats.tasksCompleted}</span>
          </div>
          <p className="text-sm text-[--color-discord-muted]">Tasks Completed</p>
        </div>

        <div className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark]">
          <div className="flex items-center justify-between mb-2">
            <GitPullRequest size={20} className="text-[--color-discord-accent]" />
            <span className="text-2xl font-bold text-white">{user.stats.prsCreated}</span>
          </div>
          <p className="text-sm text-[--color-discord-muted]">PRs Created</p>
        </div>

        <div className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark]">
          <div className="flex items-center justify-between mb-2">
            <Target size={20} className="text-[--color-discord-yellow]" />
            <span className="text-2xl font-bold text-white">{user.stats.prsReviewed}</span>
          </div>
          <p className="text-sm text-[--color-discord-muted]">PRs Reviewed</p>
        </div>

        <div className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark]">
          <div className="flex items-center justify-between mb-2">
            <Trophy size={20} className="text-[--color-discord-yellow]" />
            <span className="text-2xl font-bold text-white">{user.stats.points}</span>
          </div>
          <p className="text-sm text-[--color-discord-muted]">Total Points</p>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-[--color-discord-darker] rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Permissions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(permissions).map(([permission, allowed]) => (
            <div key={permission} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${allowed ? 'bg-[--color-discord-green]' : 'bg-[--color-discord-red]'}`} />
              <span className="text-sm text-[--color-discord-text]">
                {permission.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Path */}
      <div className="bg-[--color-discord-darker] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          Recommended Learning Path
        </h3>
        <div className="space-y-3">
          {learningPath.map((item, index) => (
            <div key={index} className="bg-[--color-discord-light] rounded-lg p-4 hover:bg-[--color-discord-lighter] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <p className="text-sm text-[--color-discord-muted]">{item.type}</p>
                </div>
                <button className="px-3 py-1 bg-[--color-discord-accent] hover:bg-[#4752c4] text-white rounded text-sm">
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}