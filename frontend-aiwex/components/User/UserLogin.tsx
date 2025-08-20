'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';

interface UserLoginProps {
  onLogin: (sessionId: string, user: any) => void;
}

export default function UserLogin({ onLogin }: UserLoginProps) {
  const [selectedRole, setSelectedRole] = useState('');

  const demoAccounts = [
    { email: 'junior@company.com', role: 'Junior Developer', description: 'Learn by doing, get AI mentorship' },
    { email: 'senior@company.com', role: 'Senior Developer', description: 'Review code, architect solutions' },
    { email: 'qa@company.com', role: 'QA Engineer', description: 'Test features, ensure quality' },
    { email: 'pm@company.com', role: 'Product Manager', description: 'Plan sprints, manage features' },
  ];

  const handleLogin = async (email: string) => {
    try {
      const response = await fetch('http://localhost:3001/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
        onLogin(data.sessionId, data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[--color-discord-light] flex items-center justify-center">
      <div className="bg-[--color-discord-darker] rounded-lg p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">AI Work Simulator</h1>
        <p className="text-[--color-discord-muted] text-center mb-8">
          Choose your role and start collaborating with AI agents
        </p>

        <div className="space-y-4">
          {demoAccounts.map((account) => (
            <div
              key={account.email}
              onClick={() => handleLogin(account.email)}
              className="bg-[--color-discord-light] rounded-lg p-4 hover:bg-[--color-discord-lighter] cursor-pointer transition-all duration-200 border border-[--color-discord-dark] hover:border-[--color-discord-accent]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium text-lg">{account.role}</h3>
                  <p className="text-[--color-discord-muted] text-sm">{account.description}</p>
                  <p className="text-[--color-discord-accent] text-xs mt-1">{account.email}</p>
                </div>
                <User size={24} className="text-[--color-discord-muted]" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[--color-discord-muted] text-sm">
            Each role provides different permissions and learning experiences
          </p>
        </div>
      </div>
    </div>
  );
}