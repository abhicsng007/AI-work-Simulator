'use client';

import React from 'react';
import { Activity, TrendingUp, Users, FolderOpen, Clock, CheckCircle } from 'lucide-react';
import { Project, Task, Agent } from '@/types';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  agents: Agent[];
}

export default function Dashboard({ projects, tasks, agents }: DashboardProps) {
  const activeAgents = agents.filter(a => a.status === 'online').length;
  const activeTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  const stats = [
    { label: 'Active Projects', value: projects.length, icon: FolderOpen, color: 'bg-[--color-discord-accent]' },
    { label: 'Active Agents', value: `${activeAgents}/${agents.length}`, icon: Users, color: 'bg-[--color-discord-green]' },
    { label: 'Tasks in Progress', value: activeTasks, icon: Clock, color: 'bg-[--color-discord-yellow]' },
    { label: 'Completed Tasks', value: completedTasks, icon: CheckCircle, color: 'bg-[#3ba55d]' },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark] hover:border-[--color-discord-accent] hover:bg-[#2a2d31] hover:scale-105 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <stat.icon size={20} className="text-[--color-discord-muted]" />
              <div className={`w-2 h-2 rounded-full ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-[--color-discord-muted]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Active Projects</h2>
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark] hover:border-[--color-discord-accent] hover:bg-[#2a2d31] hover:scale-102 transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">{project.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  project.status === 'in-progress' ? 'bg-[--color-discord-accent] text-white' :
                  project.status === 'planning' ? 'bg-[--color-discord-yellow] text-black' :
                  project.status === 'review' ? 'bg-[#faa61a] text-black' :
                  'bg-[--color-discord-green] text-white'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-[--color-discord-muted] mb-3">{project.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {project.team.slice(0, 3).map((memberId) => {
                    const agent = agents.find(a => a.id === memberId);
                    return (
                      <div
                        key={memberId}
                        className="w-8 h-8 rounded-full bg-[--color-discord-accent] flex items-center justify-center border-2 border-[--color-discord-darker]"
                        title={agent?.name}
                      >
                        <span className="text-white text-xs">{agent?.avatar}</span>
                      </div>
                    );
                  })}
                  {project.team.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-[--color-discord-lighter] flex items-center justify-center border-2 border-[--color-discord-darker]">
                      <span className="text-white text-xs">+{project.team.length - 3}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-[--color-discord-muted]">Progress</p>
                    <p className="text-sm font-medium text-white">{project.progress}%</p>
                  </div>
                  <div className="w-32 bg-[--color-discord-light] rounded-full h-2">
                    <div 
                      className="bg-[--color-discord-accent] h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="bg-[--color-discord-darker] rounded-lg p-4 border border-[--color-discord-dark] hover:border-[--color-discord-accent] hover:bg-[#2a2d31] hover:scale-105 transition-all duration-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-[--color-discord-green]" />
              <p className="text-sm text-[--color-discord-text]">
                <span className="font-medium text-white">Alex Dev</span> started working on authentication
              </p>
              <span className="text-xs text-[--color-discord-muted] ml-auto">10m ago</span>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp size={16} className="text-[--color-discord-accent]" />
              <p className="text-sm text-[--color-discord-text]">
                <span className="font-medium text-white">Sarah Design</span> completed design review
              </p>
              <span className="text-xs text-[--color-discord-muted] ml-auto">25m ago</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-[--color-discord-green]" />
              <p className="text-sm text-[--color-discord-text]">
                <span className="font-medium text-white">Emma QA</span> found 3 bugs in checkout flow
              </p>
              <span className="text-xs text-[--color-discord-muted] ml-auto">1h ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}