import { Injectable } from "@nestjs/common";
import { OpenAIService } from "src/openai/openai.service";
import { Logger } from "@nestjs/common";

@Injectable()
export class AIIntegrationService {
  private readonly logger = new Logger(AIIntegrationService.name);
  constructor(private openAIService: OpenAIService) {}

    private async callOpenAIForProjectGeneration(prompt: string): Promise<any> {
        try {
                // This should call your OpenAI service with a more specific method for project generation
                // Adjust this based on your actual OpenAIService implementation
                return await this.openAIService.generateProjectStructure(prompt);
            } catch (error) {
                this.logger.error('OpenAI API call failed:', error);
                throw error;
            }
    }
}
