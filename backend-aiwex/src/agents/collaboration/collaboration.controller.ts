import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';

@Controller('agents/collaborate')
export class CollaborationController {
  constructor(private collaborationService: CollaborationService) {}

  @Post('feature')
  async createFeatureWorkflow(@Body() data: {
    issueTitle: string;
    description: string;
    assignedAgents: string[];
    repository: string;
    labels?: string[];
  }) {
    return this.collaborationService.createFeatureWorkflow(data);
  }

  @Post('sprint')
  async createSprint(@Body() data: {
    projectName: string;
    sprintGoals: string[];
    duration: string;
    team: string[];
  }) {
    return this.collaborationService.createSprint(data);
  }

  @Post('review')
  async performMultiAgentReview(@Body() data: {
    repository: string;
    pullRequestNumber: number;
    reviewers: string[];
  }) {
    return this.collaborationService.performMultiAgentReview(data);
  }

  @Get('tasks')
  getAllCollaborationTasks() {
    return this.collaborationService.getAllTasks();
  }

  @Get('task/:taskId')
  getCollaborationTask(@Param('taskId') taskId: string) {
    return this.collaborationService.getTask(taskId);
  }
}