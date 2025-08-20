'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from '@/components/Layout/Sidebar';
import MainContent from '@/components/Layout/MainContent';
import UserPanel from '@/components/Layout/UserPanel';
import UserLogin from '@/components/User/UserLogin';
import UserDashboard from '@/components/User/UserDashboard';
import UserTaskPanel from '@/components/User/UserTaskPanel';
import { agents, channels, projects, tasks, initialMessages } from '@/data/mockData';
import { Message } from '@/types';

export default function Home() {
  const [activeView, setActiveView] = useState('chat');
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Set up message listener
  useEffect(() => {
    if (!socket) return;

    const handleAgentMessage = (data: { agentId: string; message: string; channel: string; timestamp: Date }) => {
      console.log('Received agent message:', data);
      
      // Find the agent details from your mock data
      const agent = agents.find(a => a.id === data.agentId);
      
      // Create message that matches the expected format
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        content: data.message,
        authorId: data.agentId,
        authorName: agent?.name || `Agent ${data.agentId}`,
        authorRole: agent?.role || 'Agent',
        timestamp: new Date(data.timestamp),
        channelId: data.channel,
      };
      
      setMessages(prev => [...prev, newMessage]);
    };

    socket.on('agentMessage', handleAgentMessage);

    return () => {
      socket.off('agentMessage', handleAgentMessage);
    };
  }, [socket]);

  // Join/leave channels when activeChannel changes
  useEffect(() => {
    if (socket && currentUser) {
      socket.emit('leaveChannel', activeChannel);
      socket.emit('joinChannel', activeChannel);
    }
  }, [activeChannel, socket, currentUser]);

  // Check for existing session on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      fetchUserProfile(storedSessionId);
    }
  }, []);

  const fetchUserProfile = async (sessionId: string) => {
    try {
      const response = await fetch('http://localhost:3001/users/profile', {
        headers: { 'x-session-id': sessionId },
      });
      const data = await response.json();
      if (!data.error) {
        setCurrentUser(data.user);
        setUserProfile(data);
        setSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleLogin = (sessionId: string, user: any) => {
    setSessionId(sessionId);
    setCurrentUser(user);
    fetchUserProfile(sessionId);
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionId');
    setCurrentUser(null);
    setUserProfile(null);
    setSessionId('');
  };

  const handleSendMessage = async (content: string) => {
  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    content,
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorRole: currentUser.role,
    timestamp: new Date(),
    channelId: activeChannel,
  };
  
  setMessages(prev => [...prev, newMessage]);
  
  // Send to backend for command processing
  try {
    await fetch('http://localhost:3001/agents/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        message: content,
        channelId: activeChannel
      })
    });
  } catch (error) {
    console.error('Error sending message to backend:', error);
  }
};

  const handleCreateFeature = async (data: any) => {
    try {
      const response = await fetch('http://localhost:3001/users/task/create-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log('Feature created:', result);
    } catch (error) {
      console.error('Failed to create feature:', error);
    }
  };

const renderMainContent = () => {
  switch (activeView) {
    case 'user-dashboard':
      return <UserDashboard {...userProfile} />;
    case 'user-tasks':
      return (
        <UserTaskPanel
          user={currentUser}
          permissions={userProfile?.permissions}
          onCreateFeature={handleCreateFeature}
          onSubmitPR={() => {}}
          onReviewPR={() => {}}
        />
      );
    default:
      // FIXED: Proper filtering logic
      const filteredMessages = activeChannel === 'general' 
        ? messages // Show ALL messages in general
        : messages.filter(m => m.channelId === activeChannel); // Show only specific channel messages in other channels
      
      return (
        <MainContent
          activeView={activeView}
          activeChannel={activeChannel}
          channels={channels}
          projects={projects}
          tasks={tasks}
          agents={agents}
          messages={filteredMessages} // Use filtered messages
          onSendMessage={handleSendMessage}
          currentUser={currentUser}
          sessionId={sessionId}
        />
      );
  }
};



  // If not logged in, show login screen
  if (!currentUser) {
    return <UserLogin onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col">
          <Sidebar
            channels={channels}
            activeView={activeView}
            activeChannel={activeChannel}
            onViewChange={setActiveView}
            onChannelSelect={setActiveChannel}
          />
          <div className="bg-[--color-discord-dark] p-2">
            <button
              onClick={() => setActiveView('user-dashboard')}
              className="w-full text-left px-3 py-2 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-text] text-sm"
            >
              My Profile
            </button>
            <button
              onClick={() => setActiveView('user-tasks')}
              className="w-full text-left px-3 py-2 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-text] text-sm"
            >
              My Tasks
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded hover:bg-[--color-discord-lighter] text-[--color-discord-red] text-sm"
            >
              Logout
            </button>
          </div>
          <UserPanel user={currentUser} />
        </div>
        
        {renderMainContent()}
      </div>
    </div>
  );
}