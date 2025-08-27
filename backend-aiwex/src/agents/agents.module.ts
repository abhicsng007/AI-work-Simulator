// src/agents/agents.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { DeveloperService } from './developer/developer.service';
import { CollaborationController } from './collaboration/collaboration.controller';
import { CollaborationService } from './collaboration/collaboration.service';
import { UserCollaborationService } from './collaboration/user-collaboration.service';
import { AgentWorkService } from './agent-work.service';
import { RealAgentCommunicationService } from './communication/real-agent-communication.service';
import { OpenAIModule } from '../openai/openai.module';
import { GithubModule } from '../github/github.module';
import { UsersModule } from '../users/users.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ProjectsModule } from '../projects/projects.module'; // ADD THIS
import { Message, MessageSchema } from '../database/schemas/message.schema';
import { Task, TaskSchema } from '../database/schemas/task.schema';
import { Agent, AgentSchema } from '../database/schemas/agent.schema';
import { Channel, ChannelSchema } from '../database/schemas/channel.schema';
import { AgentInitializationService } from './agent-initialization.service';
import { TaskExecutionService } from './task-execution.service';
import { PrReviewService } from './pr-review.service';
import { GitHubActivityService } from './github-activity.service';
import { ChatHandlerService } from './chat-handler.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
    OpenAIModule,
    GithubModule,
    WebsocketModule,
    forwardRef(() => UsersModule),
    forwardRef(() => ProjectsModule), // ADD THIS
  ],
  controllers: [AgentsController, CollaborationController],
  providers: [
    AgentsService,
    DeveloperService,
    CollaborationService,
    UserCollaborationService,
    AgentWorkService,
    RealAgentCommunicationService, // ADD THIS
    AgentInitializationService,
    TaskExecutionService,
    PrReviewService,
    GitHubActivityService,
    ChatHandlerService,
  ],
  exports: [
    AgentsService,
    DeveloperService,
    CollaborationService,
    UserCollaborationService,
    AgentWorkService,
    RealAgentCommunicationService, // ADD THIS
  ],
})
export class AgentsModule {}