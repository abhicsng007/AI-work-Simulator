'use client';

import React from 'react';
import { Hash, Users, FolderKanban, LayoutDashboard, Bot, Plus, Settings } from 'lucide-react';
import { Channel } from '@/types';
import clsx from 'clsx';

interface SidebarProps {
  channels: Channel[];
  activeView: string;
  activeChannel?: string;
  onViewChange: (view: string) => void;
  onChannelSelect: (channelId: string) => void;
}

export default function Sidebar({ 
  channels, 
  activeView, 
  activeChannel,
  onViewChange, 
  onChannelSelect 
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="w-60 bg-[--color-discord-darker] flex flex-col h-full overflow-hidden">
      {/* Workspace Header */}
      <div className="p-4 border-b border-[--color-discord-dark] shadow-md">
        <h2 className="text-white font-semibold text-lg">AI Workspace</h2>
        <p className="text-[--color-discord-muted] text-sm">Collaborative Environment</p>
      </div>

      {/* Navigation Menu */}
      <div className="px-2 py-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md mb-1 discord-hover',
              activeView === item.id ? 'bg-[--color-discord-lighter] text-white' : 'text-[--color-discord-muted]'
            )}
          >
            <item.icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Channels Section */}
      <div className="flex-1 px-2 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-[--color-discord-muted] uppercase">Channels</span>
          <Plus size={16} className="text-[--color-discord-muted] cursor-pointer hover:text-white" />
        </div>
        
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => {
              onViewChange('chat');
              onChannelSelect(channel.id);
            }}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-md mb-1 discord-hover',
              activeView === 'chat' && activeChannel === channel.id 
                ? 'bg-[--color-discord-lighter] text-white' 
                : 'text-[--color-discord-muted]'
            )}
          >
            <Hash size={16} />
            <span className="text-sm">{channel.name}</span>
          </button>
        ))}
      </div>

      {/* User Settings */}
      <div className="p-2 border-t border-[--color-discord-dark]">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md discord-hover">
          <Settings size={18} className="text-[--color-discord-muted]" />
          <span className="text-sm text-[--color-discord-muted]">Settings</span>
        </button>
      </div>
    </div>
  );
}