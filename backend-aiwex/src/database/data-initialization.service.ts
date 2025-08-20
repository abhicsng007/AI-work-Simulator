import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent, AgentDocument } from './schemas/agent.schema';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { Project, ProjectDocument } from './schemas/project.schema';
import { Task, TaskDocument } from './schemas/task.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { agents, channels, projects, tasks, initialMessages } from '../data/mockData';

@Injectable()
export class DataInitializationService implements OnModuleInit {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async onModuleInit() {
    await this.initializeData();
  }

  private async initializeData() {
    // Initialize Agents
    const agentCount = await this.agentModel.countDocuments();
    if (agentCount === 0) {
      console.log('Initializing AI agents...');
      for (const agent of agents) {
        await this.agentModel.create({
          agentId: agent.id,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          avatar: agent.avatar,
          personality: agent.personality,
          skills: agent.skills,
          configuration: {
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 2000,
          },
        });
      }
      console.log('AI agents initialized');
    }

    // Initialize Channels
    const channelCount = await this.channelModel.countDocuments();
    if (channelCount === 0) {
      console.log('Initializing channels...');
      for (const channel of channels) {
        await this.channelModel.create({
          channelId: channel.id,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          agentMembers: agents.map(a => a.id),
        });
      }
      console.log('Channels initialized');
    }

    // Initialize Projects (without team ObjectIds for now)
    const projectCount = await this.projectModel.countDocuments();
    if (projectCount === 0) {
      console.log('Initializing projects...');
      for (const project of projects) {
        const createdProject = await this.projectModel.create({
          name: project.name,
          description: project.description,
          status: project.status,
          type: 'static',
          deadline: project.deadline,
          progress: project.progress,
          team: [], // Will be populated with actual user ObjectIds
        });

        // Create tasks for this project
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        for (const task of projectTasks) {
          await this.taskModel.create({
            title: task.title,
            description: task.description,
            type: task.type,
            projectId: createdProject._id,
            assignedTo: task.assignedTo[0], // Agent ID or user role
            status: task.status,
            priority: task.priority,
            estimatedHours: 8, // Default estimate
            labels: [],
          });
        }
      }
      console.log('Projects and tasks initialized');
    }

    // Initialize Messages
    const messageCount = await this.messageModel.countDocuments();
    if (messageCount === 0) {
      console.log('Initializing messages...');
      
      // Get channel ObjectIds
      const channelDocs = await this.channelModel.find();
      const channelMap = new Map(channelDocs.map(c => [c.channelId, c._id]));

      for (const message of initialMessages) {
        const channelObjectId = channelMap.get(message.channelId);
        if (channelObjectId) {
          const agent = agents.find(a => a.id === message.authorId);
          
          await this.messageModel.create({
            content: message.content,
            authorId: message.authorId,
            agentId: agent ? message.authorId : undefined,
            authorName: message.authorName,
            authorRole: message.authorRole,
            channelId: message.channelId,
            channelObjectId,
            createdAt: message.timestamp,
          });
        }
      }
      console.log('Messages initialized');
    }
  }

  // Method to reset all data (useful for development)
  async resetDatabase() {
    console.log('Resetting database...');
    await Promise.all([
      this.agentModel.deleteMany({}),
      this.channelModel.deleteMany({}),
      this.projectModel.deleteMany({}),
      this.taskModel.deleteMany({}),
      this.messageModel.deleteMany({}),
    ]);
    await this.initializeData();
    console.log('Database reset complete');
  }
}