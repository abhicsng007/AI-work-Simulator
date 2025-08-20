'use client';

import React from 'react';
import { Bot, Code, Palette, TestTube, BarChart, Briefcase, Circle } from 'lucide-react';
import { Agent, Task } from '@/types';
import clsx from 'clsx';

interface AgentViewProps {
  agents: Agent[];
  tasks: Task[];
}

export default function AgentView({ agents, tasks }: AgentViewProps) {
  const getRoleIcon = (role: Agent['role']) => {
    switch (role) {
      case 'developer': return <Code size={20} />;
      case 'designer': return <Palette size={20} />;
      case 'qa': return <TestTube size={20} />;
      case 'manager': return <Briefcase size={20} />;
      case 'analyst': return <BarChart size={20} />;
    }
  };

  const getRoleColor = (role: Agent['role']) => {
    switch (role) {
      case 'developer': return 'bg-blue-500';
      case 'designer': return 'bg-purple-500';
      case 'qa': return 'bg-green-500';
      case 'manager': return 'bg-orange-500';
      case 'analyst': return 'bg-pink-500';
    }
  };

  const getAgentTasks = (agentId: string) => {
    return tasks.filter(task => task.assignedTo.includes(agentId));
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online': return 'bg-[--color-discord-green]';
      case 'busy': return 'bg-[--color-discord-yellow]';
      case 'offline': return 'bg-[--color-discord-muted]';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-6">AI Agents</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const agentTasks = getAgentTasks(agent.id);
          const activeTasks = agentTasks.filter(t => t.status === 'in-progress').length;
          
          return (
            <div key={agent.id} className="bg-[--color-discord-darker] rounded-lg p-5 border border-[--color-discord-dark] hover:border-[--color-discord-accent] hover:bg-[#2a2d31] hover:scale-105 transition-all duration-200 cursor-pointer">
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    getRoleColor(agent.role)
                  )}>
                    <span className="text-2xl">{agent.avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleIcon(agent.role)}
                      <span className="text-sm text-[--color-discord-muted] capitalize">{agent.role}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Circle size={8} className={clsx('fill-current', getStatusColor(agent.status))} />
                  <span className="text-xs text-[--color-discord-muted] capitalize">{agent.status}</span>
                </div>
              </div>

              {/* Personality */}
              <p className="text-sm text-[--color-discord-text] mb-4 italic">"{agent.personality}"</p>

              {/* Skills */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[--color-discord-muted] uppercase mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.map((skill) => (
                    <span 
                      key={skill} 
                      className="px-2 py-1 bg-[--color-discord-light] rounded text-xs text-[--color-discord-text]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Current Tasks */}
              <div className="border-t border-[--color-discord-light] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[--color-discord-muted] uppercase">Tasks</h4>
                  <span className="text-xs text-[--color-discord-muted]">
                    {activeTasks} active / {agentTasks.length} total
                  </span>
                </div>
                
                {agentTasks.length > 0 ? (
                  <div className="space-y-1">
                    {agentTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="text-sm text-[--color-discord-text]">
                        <span className={clsx(
                          'inline-block w-2 h-2 rounded-full mr-2',
                          task.status === 'done' && 'bg-[--color-discord-green]',
                          task.status === 'in-progress' && 'bg-[--color-discord-accent]',
                          task.status === 'review' && 'bg-[--color-discord-yellow]',
                          task.status === 'todo' && 'bg-[--color-discord-muted]'
                        )} />
                        {task.title}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[--color-discord-muted] italic">No tasks assigned</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 px-3 bg-[--color-discord-accent] hover:bg-[#4752c4] text-white rounded text-sm font-medium transition-colors">
                  <Bot size={14} className="inline mr-1" />
                  Chat
                </button>
                <button className="flex-1 py-2 px-3 bg-[--color-discord-light] hover:bg-[--color-discord-lighter] text-white rounded text-sm font-medium transition-colors">
                  Assign Task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}