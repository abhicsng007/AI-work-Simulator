import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [ChannelsController],
})
export class ChannelsModule {}