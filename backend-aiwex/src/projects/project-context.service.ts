import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { GeneratedProject , GeneratedTask } from "./project.interface";

@Injectable()
export class ProjectContextService {
  private readonly logger = new Logger(ProjectContextService.name);
  private projects = new Map<string, GeneratedProject>();

  getAllProjectContexts(): string[] {
    const projectIds = Array.from(this.projects.keys());
    this.logger.log(`Currently stored project contexts: ${projectIds.join(', ') || 'none'}`);
    return projectIds;
  }

  getProjectContext(projectId: string): GeneratedProject | null {
    const project = this.projects.get(projectId);
    if (!project) {
      this.logger.error(`Project context not found for ID: ${projectId}`);
      return null;
    }
    return project;
  }

  storeProject(project: GeneratedProject): void {
    this.projects.set(project.id, project);
  }

  verifyProjectAndTask(projectId: string, taskId: string): { project?: GeneratedProject, task?: GeneratedTask } {
    const project = this.projects.get(projectId);
    if (!project) {
      this.logger.error(`Project ${projectId} not found`);
      this.logger.log(`Available projects: ${Array.from(this.projects.keys()).join(', ') || 'none'}`);
      return {};
    }
  
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) {
      this.logger.error(`Task ${taskId} not found in project ${projectId}`);
      this.logger.log(`Available tasks in project: ${project.tasks.map(t => t.id).join(', ') || 'none'}`);
      return { project };
    }
  
    this.logger.log(`Verified project ${projectId} and task ${taskId}`);
    return { project, task };
  }
  
  getUserProjects(userId: string): GeneratedProject[] {
    return Array.from(this.projects.values()).filter(project =>
      project.tasks.some(task => task.assignedTo === `user-${userId}`)
    );
  }
}