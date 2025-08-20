'use client';

import React from 'react';
import Dashboard from '@/components/Dashboard/Dashboard';
import DynamicProjectView from '@/components/Projects/DynamicProjectView';
import AgentView from '@/components/Agents/AgentView';
import ChatView from '@/components/Chat/ChatView';
import { Project, Task, Agent, Channel, Message } from '@/types';

interface MainContentProps {
  activeView: string;
  activeChannel?: string;
  channels: Channel[];
  projects: Project[];
  tasks: Task[];
  agents: Agent[];
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUser?: any;
  sessionId?: string;
}

export default function MainContent({
  activeView,
  activeChannel,
  channels,
  projects,
  tasks,
  agents,
  messages,
  onSendMessage,
  currentUser,
  sessionId,
}: MainContentProps) {
  const currentChannel = channels.find(c => c.id === activeChannel);
  const channelMessages = messages.filter(m => m.channelId === activeChannel);

  switch (activeView) {
    case 'dashboard':
      return <Dashboard projects={projects} tasks={tasks} agents={agents} />;
    
    case 'projects':
      return <DynamicProjectView 
        staticProjects={projects} 
        tasks={tasks} 
        agents={agents}
        currentUser={currentUser}
        sessionId={sessionId}
      />;
    
    case 'agents':
      return <AgentView agents={agents} tasks={tasks} />;
    
    case 'chat':
      if (!currentChannel) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[--color-discord-muted]">Select a channel to start chatting</p>
          </div>
        );
      }
      return (
        <ChatView
          channel={currentChannel}
          messages={channelMessages}
          agents={agents}
          onSendMessage={onSendMessage}
        />
      );
    
    case 'team':
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[--color-discord-muted]">Team view coming soon...</p>
        </div>
      );
    
    default:
      return <Dashboard projects={projects} tasks={tasks} agents={agents} />;
  }
}