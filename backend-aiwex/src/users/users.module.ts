import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Session, SessionSchema } from '../database/schemas/session.schema';
import { Activity, ActivitySchema } from '../database/schemas/activity.schema';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}