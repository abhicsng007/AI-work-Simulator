import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Agent, AgentSchema } from './schemas/agent.schema';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { DataInitializationService } from './data-initialization.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  providers: [DataInitializationService],
  exports: [MongooseModule, DataInitializationService],
})
export class DatabaseModule {}