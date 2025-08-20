import { Injectable } from '@nestjs/common';
import { DeveloperService } from './developer/developer.service';

@Injectable()
export class AgentsService {
  constructor(private developerService: DeveloperService) {}

  getAllAgents() {
    // In the future, this will include all agent types
    return [
      this.developerService.getAgentInfo(),
      // Add other agents here as they are implemented:
      // this.designerService.getAgentInfo(),
      // this.qaService.getAgentInfo(),
      // this.managerService.getAgentInfo(),
      // this.analystService.getAgentInfo(),
    ];
  }
}