import { Injectable, Logger } from '@nestjs/common';
import { RealAgentCommunicationService } from './communication/real-agent-communication.service';

@Injectable()
export class GitHubActivityService {
  private readonly logger = new Logger(GitHubActivityService.name);

  constructor(
    private realCommunicationService: RealAgentCommunicationService,
  ) {}

  async sendGitHubActivityMessage(
    agentId: string, 
    activity: string, 
    details: any
  ): Promise<void> {
    try {
      let message = '';
      
      switch (activity) {
        case 'branch_created':
          message = `Branch Created: \`${details.branchName}\` for task "${details.taskTitle}"`;
          break;
        case 'files_committed':
          message = `Files Committed: Added ${details.fileCount} files to \`${details.branchName}\`\n${details.files.map(f => `- \`${f}\``).join('\n')}`;
          break;
        case 'pr_created':
          message = `Pull Request Created: [#${details.prNumber}](${details.prUrl}) - "${details.title}"\nBranch: \`${details.branchName}\` → \`main\``;
          break;
        case 'issue_created':
          message = `Issue Created: [#${details.issueNumber}](${details.issueUrl}) - "${details.title}"`;
          break;
        case 'pr_reviewed':
          message = `Pull Request Reviewed: [#${details.prNumber}](${details.repository}) \n${details.approved ? 'Approved' : 'Comments added'}\n${details.summary}`;
          break;
        case 'pr_merged':
          message = `Pull Request Merged: [#${details.prNumber}](${details.repository})\nSuccessfully merged by ${details.mergedBy}`;
          break;
        case 'review_request':
          message = `Review Requested: ${details.authorName} requested my review on PR #${details.prNumber} for "${details.taskTitle}"`;
          break;
        case 'task_started':
          message = `Started Working: Beginning implementation of "${details.taskTitle}"\nEstimated: ${details.estimatedHours} hours`;
          break;
        case 'task_completed':
          message = `Task Completed: "${details.taskTitle}"\nStatus: Ready for review`;
          break;
        default:
          message = `GitHub Activity: ${activity} - ${JSON.stringify(details)}`;
      }

      await this.realCommunicationService.sendAIMessage(
        agentId,
        'general',
        'general_update',
        {
          conversationTopic: 'github_activity',
          activityType: activity,
          activityDetails: details
        }
      );

      this.logger.log(`GitHub activity message sent: ${agentId} - ${activity}`);
    } catch (error) {
      this.logger.error(`Error sending GitHub activity message:`, error);
    }
  }

  getCurrentTaskForAgent(agentId: string, activeWork: Map<string, any>): any {
    for (const [workKey, work] of activeWork.entries()) {
      if (work.agentId === agentId) {
        return {
          title: work.taskId,
          status: work.status,
          progress: work.progress
        };
      }
    }
    return null;
  }
}