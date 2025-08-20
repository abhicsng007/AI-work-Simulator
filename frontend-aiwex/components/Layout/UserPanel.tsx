'use client';

import React from 'react';
import { Mic, Headphones, Settings } from 'lucide-react';

interface UserPanelProps {
  user?: any;
}

export default function UserPanel({ user }: UserPanelProps) {
  const roleColors = {
    'junior-developer': 'bg-blue-500',
    'senior-developer': 'bg-purple-500',
    'qa-engineer': 'bg-green-500',
    'product-manager': 'bg-orange-500',
  };

  return (
    <div className="bg-[--color-discord-dark] p-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${user ? roleColors[user.role as keyof typeof roleColors] || 'bg-[--color-discord-accent]' : 'bg-[--color-discord-accent]'} flex items-center justify-center`}>
          <span className="text-white text-sm font-medium">{user ? user.name[0] : 'U'}</span>
        </div>
        <div>
          <p className="text-white text-sm font-medium">{user ? user.name : 'User'}</p>
          <p className="text-[--color-discord-green] text-xs">{user ? `Level ${user.level}` : 'Online'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="p-2 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-muted] hover:text-white">
          <Mic size={18} />
        </button>
        <button className="p-2 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-muted] hover:text-white">
          <Headphones size={18} />
        </button>
        <button className="p-2 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-muted] hover:text-white">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}