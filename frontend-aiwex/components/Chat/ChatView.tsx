// Update your components/Chat/ChatView.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash, Users, Pin, Bell, ChevronRight, ChevronLeft } from 'lucide-react';
import { Message, Agent, Channel } from '@/types';
import GitHubActivity from '@/components/GitHub/GitHubActivity'; // Import the component
import clsx from 'clsx';

interface ChatViewProps {
  channel: Channel;
  messages: Message[];
  agents: Agent[];
  onSendMessage: (content: string) => void;
  sessionId?: string; // Add sessionId prop
}

export default function ChatView({ channel, messages, agents, onSendMessage, sessionId }: ChatViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [showGitHubPanel, setShowGitHubPanel] = useState(true); // Toggle for GitHub panel
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
  if (inputValue.trim()) {
    onSendMessage(inputValue);
    
    // Check for PR review commands
    if (inputValue.toLowerCase().includes('review pr') || 
        inputValue.toLowerCase().includes('review #')) {
      // Visual feedback that command was recognized
      console.log('PR review command detected');
    }
    
    setInputValue('');
  }
};

const ChatHelp = () => (
  <div className="text-xs text-[--color-discord-muted] p-2">
    <p>💡 Quick commands:</p>
    <p>• "review PR #123 in repo-name" - Request PR review</p>
    <p>• "status of PR #123" - Check PR status</p>
  </div>
);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAgentStatus = (authorId: string) => {
    const agent = agents.find(a => a.id === authorId);
    return agent?.status || 'offline';
  };

  return (
    <div className="flex-1 flex bg-[--color-discord-light]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[--color-discord-dark] shadow-sm">
          <div className="flex items-center gap-2">
            <Hash size={20} className="text-[--color-discord-muted]" />
            <h3 className="font-semibold text-white">{channel.name}</h3>
            <span className="text-[--color-discord-muted] text-sm">|</span>
            <p className="text-[--color-discord-muted] text-sm">{channel.description}</p>
            {channel.id === 'general' && (
              <span className="text-xs bg-[--color-discord-accent] px-2 py-1 rounded text-white">
                All Channels
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-[--color-discord-muted] cursor-pointer hover:text-white" />
            <Pin size={20} className="text-[--color-discord-muted] cursor-pointer hover:text-white" />
            <Users size={20} className="text-[--color-discord-muted] cursor-pointer hover:text-white" />
            {/* Toggle GitHub Panel Button */}
            <button
              onClick={() => setShowGitHubPanel(!showGitHubPanel)}
              className="p-1 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-muted] hover:text-white"
              title="Toggle GitHub Activity"
            >
              {showGitHubPanel ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => {
            const status = getAgentStatus(message.authorId);
            const isFromDifferentChannel = message.channelId !== channel.id;
            
            return (
              <div key={message.id} className="flex gap-3 mb-4 hover:bg-[--color-discord-lighter] p-2 rounded">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[--color-discord-accent] flex items-center justify-center relative">
                    <span className="text-white font-medium">{message.authorName[0]}</span>
                    <div 
                      className={clsx(
                        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[--color-discord-light]',
                        status === 'online' && 'bg-[--color-discord-green]',
                        status === 'busy' && 'bg-[--color-discord-yellow]',
                        status === 'offline' && 'bg-[--color-discord-muted]'
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-white">{message.authorName}</span>
                    {isFromDifferentChannel && channel.id === 'general' && (
                      <span className="text-xs bg-[--color-discord-darker] px-2 py-1 rounded text-[--color-discord-muted]">
                        #{message.channelId}
                      </span>
                    )}
                    <span className="text-xs text-[--color-discord-muted]">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[--color-discord-text] mt-1">{message.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[--color-discord-dark]">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-[--color-discord-lighter] rounded-lg">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${channel.name}${channel.id === 'general' ? ' (all channels)' : ''}`}
                className="w-full p-3 bg-transparent resize-none outline-none text-white placeholder-[--color-discord-muted]"
                rows={1}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={clsx(
                'p-3 rounded-lg transition-colors',
                inputValue.trim() 
                  ? 'bg-[--color-discord-accent] hover:bg-[#4752c4] text-white' 
                  : 'bg-[--color-discord-lighter] text-[--color-discord-muted] cursor-not-allowed'
              )}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* GitHub Activity Side Panel - NEW */}
      {showGitHubPanel && sessionId && (
        <div className="w-80 border-l border-[--color-discord-dark] bg-[--color-discord-darker] flex flex-col">
          <div className="p-4 border-b border-[--color-discord-dark]">
            <h3 className="font-semibold text-white">GitHub Activity</h3>
            <p className="text-sm text-[--color-discord-muted]">Real-time development updates</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <GitHubActivity sessionId={sessionId} />
          </div>
        </div>
      )}
    </div>
  );
}