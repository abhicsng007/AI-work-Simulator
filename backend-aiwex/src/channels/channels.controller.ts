import { Controller, Get } from '@nestjs/common';
import { AgentWorkService } from '../agents/agent-work.service';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly agentWorkService: AgentWorkService) {}

  @Get()
  async getAllChannels() {
    try {
      const channels = await this.agentWorkService.getAllChannelsFromDB();
      return channels.map((channel: any) => ({
        id: channel.channelId,
        channelId: channel.channelId,
        name: channel.name,
        description: channel.description,
        type: channel.type || 'text',
        isDefault: channel.isDefault || false
      }));
    } catch (error: any) {
      return { error: 'Failed to fetch channels', details: error.message };
    }
  }
}