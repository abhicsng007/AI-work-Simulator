import { Module, forwardRef } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubCollaborationService } from './github-collaboration.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [GithubController],
  providers: [GithubService, GithubCollaborationService],
  exports: [GithubService, GithubCollaborationService],
})
export class GithubModule {}