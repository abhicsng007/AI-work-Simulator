'use client';

import React, { useState } from 'react';
import { Plus, GitBranch, GitPullRequest, MessageSquare, Lightbulb, Send } from 'lucide-react';

interface UserTaskPanelProps {
  user: any;
  permissions: any;
  onCreateFeature: (data: any) => void;
  onSubmitPR: (data: any) => void;
  onReviewPR: (data: any) => void;
}

export default function UserTaskPanel({ user, permissions, onCreateFeature, onSubmitPR, onReviewPR }: UserTaskPanelProps) {
  const [activeTab, setActiveTab] = useState('create');
  const [featureForm, setFeatureForm] = useState({
    title: '',
    description: '',
    repository: 'todo-api-project',
    requestGuidance: true,
  });

  const handleCreateFeature = () => {
    onCreateFeature(featureForm);
    setFeatureForm({ ...featureForm, title: '', description: '' });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-white mb-6">Work Panel</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {permissions.canCreateIssue && (
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded ${activeTab === 'create' ? 'bg-[--color-discord-accent]' : 'bg-[--color-discord-darker]'} text-white`}
          >
            Create Feature
          </button>
        )}
        {permissions.canCreatePR && (
          <button
            onClick={() => setActiveTab('pr')}
            className={`px-4 py-2 rounded ${activeTab === 'pr' ? 'bg-[--color-discord-accent]' : 'bg-[--color-discord-darker]'} text-white`}
          >
            Submit PR
          </button>
        )}
        {permissions.canReviewCode && (
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 rounded ${activeTab === 'review' ? 'bg-[--color-discord-accent]' : 'bg-[--color-discord-darker]'} text-white`}
          >
            Review Code
          </button>
        )}
      </div>

      {/* Create Feature Tab */}
      {activeTab === 'create' && permissions.canCreateIssue && (
        <div className="bg-[--color-discord-darker] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={20} />
            Create New Feature
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Feature Title</label>
              <input
                type="text"
                value={featureForm.title}
                onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-discord-accent]"
                placeholder="e.g., Add user authentication"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Description</label>
              <textarea
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-[--color-discord-accent]"
                placeholder="Describe what needs to be implemented..."
              />
            </div>
            
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Repository</label>
              <select
                value={featureForm.repository}
                onChange={(e) => setFeatureForm({ ...featureForm, repository: e.target.value })}
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-discord-accent]"
              >
                <option value="todo-api-project">todo-api-project</option>
                <option value="todo-frontend">todo-frontend</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="guidance"
                checked={featureForm.requestGuidance}
                onChange={(e) => setFeatureForm({ ...featureForm, requestGuidance: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="guidance" className="text-sm text-[--color-discord-text] flex items-center gap-2">
                <Lightbulb size={16} className="text-[--color-discord-yellow]" />
                Request AI guidance and mentorship
              </label>
            </div>
            
            <button
              onClick={handleCreateFeature}
              disabled={!featureForm.title || !featureForm.description}
              className="w-full py-2 bg-[--color-discord-accent] hover:bg-[#4752c4] disabled:bg-[--color-discord-lighter] disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
            >
              Create Feature Issue
            </button>
          </div>

          {user.role === 'junior-developer' && (
            <div className="mt-4 p-4 bg-[--color-discord-light] rounded-lg">
              <p className="text-sm text-[--color-discord-muted]">
                <strong>Tip:</strong> As a junior developer, AI agents will provide step-by-step guidance on implementing your features. Don't hesitate to ask for help!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit PR Tab */}
      {activeTab === 'pr' && permissions.canCreatePR && (
        <div className="bg-[--color-discord-darker] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GitPullRequest size={20} />
            Submit Pull Request
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Branch Name</label>
              <input
                type="text"
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2"
                placeholder="feature/your-branch-name"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">PR Title</label>
              <input
                type="text"
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2"
                placeholder="Brief description of changes"
              />
            </div>
            
            <button className="w-full py-2 bg-[--color-discord-accent] hover:bg-[#4752c4] text-white rounded font-medium">
              Create Pull Request
            </button>
          </div>
        </div>
      )}

      {/* Review Code Tab */}
      {activeTab === 'review' && permissions.canReviewCode && (
        <div className="bg-[--color-discord-darker] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={20} />
            Review Pull Request
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Pull Request Number</label>
              <input
                type="number"
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2"
                placeholder="e.g., 5"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Your Review Comments</label>
              <textarea
                className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2 h-32"
                placeholder="Provide constructive feedback on the code..."
              />
            </div>
            
            <div>
              <label className="block text-sm text-[--color-discord-muted] mb-2">Review Decision</label>
              <select className="w-full bg-[--color-discord-light] text-white rounded px-3 py-2">
                <option value="comment">Comment</option>
                <option value="approve">Approve</option>
                <option value="request-changes">Request Changes</option>
              </select>
            </div>
            
            <button className="w-full py-2 bg-[--color-discord-accent] hover:bg-[#4752c4] text-white rounded font-medium">
              Submit Review
            </button>
          </div>

          {user.role === 'senior-developer' && (
            <div className="mt-4 p-4 bg-[--color-discord-light] rounded-lg">
              <p className="text-sm text-[--color-discord-muted]">
                <strong>Senior Dev Tip:</strong> Focus on architecture, performance, and maintainability in your reviews. Help juniors learn best practices.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}