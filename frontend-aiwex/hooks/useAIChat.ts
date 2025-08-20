// hooks/useAIChat.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '@/types';

interface UseAIChatProps {
  sessionId: string;
  currentUser: any;
  onMessageReceived: (message: Message) => void;
}

export const useAIChat = ({ 
  sessionId, 
  currentUser, 
  onMessageReceived 
}: UseAIChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId || !currentUser) return;

    // Connect to your existing WebSocket
    const socket = io('http://localhost:3001', {
      auth: {
        sessionId,
        userId: currentUser.id,
        userName: currentUser.name
      }
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('Connected to AI chat');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from AI chat');
      setIsConnected(false);
    });

    // Join chat channels
    socket.emit('join-channels', {
      userId: currentUser.id,
      channels: ['general', 'development', 'design', 'qa']
    });

    // Listen for AI agent messages (using your existing event)
    socket.on('agentMessage', (data) => {
      const message: Message = {
        id: `agent-${Date.now()}-${Math.random()}`,
        content: data.message,
        authorId: data.agentId,
        authorName: data.agentName || data.agentId,
        authorRole: data.agentRole || 'AI Agent',
        timestamp: new Date(data.timestamp),
        channelId: data.channel,
      };
      onMessageReceived(message);
    });

    // Listen for new AI chat messages
    socket.on('agent-message', (data) => {
      const message: Message = {
        id: `chat-${Date.now()}-${Math.random()}`,
        content: data.message,
        authorId: data.agentId,
        authorName: data.agentName || data.agentId,
        authorRole: data.agentRole || 'AI Agent',
        timestamp: new Date(data.timestamp),
        channelId: data.channel,
      };
      onMessageReceived(message);
    });

    // Listen for user message broadcasts
    socket.on('user-message-broadcast', (data) => {
      const message: Message = {
        id: data.id,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorRole: data.authorRole,
        timestamp: new Date(data.timestamp),
        channelId: data.channelId,
      };
      onMessageReceived(message);
    });

    // Listen for typing indicators
    socket.on('user-typing', (data) => {
      console.log(`${data.userName} is typing in ${data.channelId}`);
      // You can handle typing indicators here if needed
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, currentUser, onMessageReceived]);

  // Send user message
  const sendMessage = useCallback((channelId: string, content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user-message', {
        channelId,
        content,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
      });
    }
  }, [currentUser]);

  // Mention a specific agent
  const mentionAgent = useCallback((channelId: string, agentId: string, message: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mention-agent', {
        channelId,
        agentId,
        message,
      });
    }
  }, []);

  // Trigger AI conversation
  const triggerAIConversation = useCallback((channelId: string, topic: string, participants: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('trigger-conversation', {
        channelId,
        topic,
        participants,
      });
    }
  }, []);

  // Join a specific channel
  const joinChannel = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('joinChannel', `channel-${channelId}`);
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((channelId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', {
        channelId,
        isTyping,
      });
    }
  }, []);

  // Get agent status
  const getAgentStatus = useCallback((agentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('get-agent-status', { agentId });
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    mentionAgent,
    triggerAIConversation,
    joinChannel,
    sendTypingIndicator,
    getAgentStatus,
  };
};