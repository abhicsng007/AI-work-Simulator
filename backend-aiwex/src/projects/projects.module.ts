import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectCreatorService } from './project-creator.service';
import { OpenAIModule } from '../openai/openai.module';
import { GithubModule } from '../github/github.module';
import { AgentsModule } from '../agents/agents.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    OpenAIModule,
    GithubModule,
    forwardRef(() => AgentsModule),
    UsersModule
  ],
  controllers: [ProjectsController],
  providers: [ProjectCreatorService],
  exports: [ProjectCreatorService],
})
export class ProjectsModule {}