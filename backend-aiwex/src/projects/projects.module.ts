import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectCreatorService } from './project-creator.service';
import { OpenAIModule } from '../openai/openai.module';
import { GithubModule } from '../github/github.module';
import { AgentsModule } from '../agents/agents.module';
import { UsersModule } from '../users/users.module';
import { ProjectQuestionsService } from './project-questions.service';
import { ProjectContextService } from './project-context.service';
import { ProjectGenerationService } from './project-generation.service';
import { TaskManagementService } from './task-management.service';
import { CodeGenerationService } from './code-generation.service';
import { GithubIntegrationService } from './github-integration.service';
import { AIIntegrationService } from './ai-integration.service';

@Module({
  imports: [
    OpenAIModule,
    GithubModule,
    forwardRef(() => AgentsModule),
    UsersModule
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectCreatorService,
    ProjectQuestionsService,
    ProjectContextService,
    ProjectGenerationService,
    TaskManagementService,
    CodeGenerationService,
    GithubIntegrationService,
    AIIntegrationService,

  ],
  exports: [ProjectCreatorService],
})
export class ProjectsModule {}