'use client';

import React, { useState, useEffect } from 'react';
import { Plus, GitBranch, Users, Clock, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import ProjectWizard from './ProjectsWizard';
import { Project, Task, Agent } from '@/types';

interface DynamicProjectViewProps {
  staticProjects: Project[];
  tasks: Task[];
  agents: Agent[];
  currentUser?: any;
  sessionId?: string;
}

interface GeneratedProject {
  id: string;
  name: string;
  description: string;
  type: string;
  repository: string;
  features: string[];
  techStack: string[];
  timeline: string;
  tasks: any[];
  status: string;
}

export default function DynamicProjectView({ 
  staticProjects, 
  tasks, 
  agents,
  currentUser,
  sessionId 
}: DynamicProjectViewProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [generatedProjects, setGeneratedProjects] = useState<GeneratedProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchUserProjects();
    }
  }, [sessionId]);

  const fetchUserProjects = async () => {
    try {
      const response = await fetch('http://localhost:3001/projects/user/projects', {
        headers: { 'x-session-id': sessionId! }
      });
      const data = await response.json();
      setGeneratedProjects(data);
    } catch (error) {
      console.error('Failed to fetch user projects:', error);
    }
  };

  const handleGenerateProject = async (answers: any[]) => {
    setLoading(true);
    setShowWizard(false);
    
    try {
      const response = await fetch('http://localhost:3001/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || ''
        },
        body: JSON.stringify({ answers })
      });
      
      const newProject = await response.json();
      setGeneratedProjects([...generatedProjects, newProject]);
      
      // Show success notification
      alert(`Project "${newProject.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to generate project:', error);
      alert('Failed to generate project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTasksByProject = (projectId: string, projectTasks: any[]) => {
    return projectTasks || [];
  };

  const getAgentById = (agentRole: string) => {
    const agentMap: Record<string, Agent | undefined> = {
      'developer': agents.find(a => a.role === 'developer'),
      'designer': agents.find(a => a.role === 'designer'),
      'qa': agents.find(a => a.role === 'qa'),
      'manager': agents.find(a => a.role === 'manager'),
      'analyst': agents.find(a => a.role === 'analyst')
    };
    return agentMap[agentRole];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[--color-discord-red]';
      case 'medium': return 'text-[--color-discord-yellow]';
      case 'low': return 'text-[--color-discord-green]';
      default: return 'text-[--color-discord-muted]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <AlertCircle size={16} />;
      case 'in-progress': return <Clock size={16} />;
      case 'review': return <CheckCircle size={16} />;
      case 'done': return <CheckCircle size={16} className="text-[--color-discord-green]" />;
      default: return null;
    }
  };

  if (showWizard) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <ProjectWizard 
          onComplete={handleGenerateProject}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        {currentUser && (
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-[--color-discord-accent] hover:bg-[#4752c4] text-white rounded-lg flex items-center gap-2"
          >
            <Sparkles size={20} />
            Create AI Project
          </button>
        )}
      </div>

      {loading && (
        <div className="bg-[--color-discord-darker] rounded-lg p-8 text-center">
          <div className="animate-pulse">
            <p className="text-white text-lg">🤖 AI agents are planning your project...</p>
            <p className="text-[--color-discord-muted] mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Generated Projects */}
        {generatedProjects.map((project) => {
          const projectTasks = getTasksByProject(project.id, project.tasks);
          const userTasks = projectTasks.filter(t => t.assignedTo === `user-${currentUser?.role}`);
          const aiTasks = projectTasks.filter(t => !t.assignedTo.startsWith('user-'));
          
          return (
            <div key={project.id} className="bg-[--color-discord-darker] rounded-lg p-6 border border-[--color-discord-dark] hover:border-[--color-discord-accent] transition-all">
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-[--color-discord-accent]" size={20} />
                    <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                    <span className="px-2 py-1 bg-[--color-discord-accent] text-white text-xs rounded">AI Generated</span>
                  </div>
                  <p className="text-[--color-discord-muted] mb-3">{project.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <GitBranch size={16} className="text-[--color-discord-muted]" />
                      <a href={`https://github.com/${project.repository}`} target="_blank" rel="noopener noreferrer" className="text-[--color-discord-accent] hover:underline">
                        {project.repository}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[--color-discord-muted]" />
                      <span className="text-[--color-discord-text]">{project.timeline}</span>
                    </div>
                  </div>
                </div>
                
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  project.status === 'in-progress' ? 'bg-[--color-discord-accent] text-white' :
                  project.status === 'planning' ? 'bg-[--color-discord-yellow] text-black' :
                  'bg-[--color-discord-green] text-white'
                }`}>
                  {project.status}
                </span>
              </div>

              {/* Tech Stack */}
              <div className="mb-4">
                <p className="text-sm text-[--color-discord-muted] mb-2">Tech Stack:</p>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span key={tech} className="px-2 py-1 bg-[--color-discord-light] rounded text-xs text-white">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <p className="text-sm text-[--color-discord-muted] mb-2">Features:</p>
                <div className="flex flex-wrap gap-2">
                  {project.features.map((feature) => (
                    <span key={feature} className="px-2 py-1 bg-[--color-discord-light] rounded text-xs text-[--color-discord-text]">
                      ✨ {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tasks Overview */}
              <div className="border-t border-[--color-discord-light] pt-4">
                <h3 className="text-lg font-medium text-white mb-3">Tasks Distribution</h3>
                
                {/* User Tasks */}
                {userTasks.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[--color-discord-accent] mb-2 flex items-center gap-2">
                      <Users size={16} />
                      Your Tasks ({userTasks.length})
                    </h4>
                    <div className="space-y-2">
                      {userTasks.map((task) => (
                        <div key={task.id} className="bg-[--color-discord-light] rounded-lg p-3 hover:bg-[--color-discord-lighter] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(task.status)}
                              <div>
                                <h5 className="font-medium text-white">{task.title}</h5>
                                <p className="text-sm text-[--color-discord-muted]">{task.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="text-xs text-[--color-discord-muted]">
                                {task.estimatedHours}h
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Agent Tasks */}
                <div>
                  <h4 className="text-sm font-medium text-[--color-discord-muted] mb-2 flex items-center gap-2">
                    <Sparkles size={16} />
                    AI Agent Tasks ({aiTasks.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {aiTasks.slice(0, 4).map((task) => {
                      const agent = getAgentById(task.assignedTo);
                      return (
                        <div key={task.id} className="bg-[--color-discord-light] rounded p-2 flex items-center gap-2">
                          <span className="text-lg">{agent?.avatar || '🤖'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{task.title}</p>
                            <p className="text-xs text-[--color-discord-muted]">{agent?.name || task.assignedTo}</p>
                          </div>
                          {getStatusIcon(task.status)}
                        </div>
                      );
                    })}
                  </div>
                  {aiTasks.length > 4 && (
                    <p className="text-xs text-[--color-discord-muted] mt-2">
                      +{aiTasks.length - 4} more tasks
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Static Projects */}
        {staticProjects.map((project) => {
          const projectTasks = getTasksByProject(project.id, tasks);
          
          return (
            <div key={project.id} className="bg-[--color-discord-darker] rounded-lg p-6 border border-[--color-discord-dark] hover:border-[--color-discord-accent] hover:bg-[#2a2d31] hover:scale-[1.02] transition-all duration-200">
              {/* Original project view code */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">{project.name}</h2>
                  <p className="text-[--color-discord-muted] mb-3">{project.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[--color-discord-muted]" />
                      <span className="text-[--color-discord-text]">
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[--color-discord-muted]" />
                      <span className="text-[--color-discord-text]">{project.team.length} members</span>
                    </div>
                  </div>
                </div>
                
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  project.status === 'in-progress' ? 'bg-[--color-discord-accent] text-white' :
                  project.status === 'planning' ? 'bg-[--color-discord-yellow] text-black' :
                  project.status === 'review' ? 'bg-[#faa61a] text-black' :
                  'bg-[--color-discord-green] text-white'
                }`}>
                  {project.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[--color-discord-muted]">Overall Progress</span>
                  <span className="text-sm font-medium text-white">{project.progress}%</span>
                </div>
                <div className="w-full bg-[--color-discord-light] rounded-full h-2">
                  <div 
                    className="bg-[--color-discord-accent] h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}