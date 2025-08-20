// src/openai/openai.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { OpenAIService } from './openai.service';

@Controller('openai')
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  @Post('generate-code')
  async generateCode(@Body() body: { prompt: string; language: string }) {
    return this.openAIService.generateCode(body.prompt, body.language);
  }

  @Post('analyze-code')
  async analyzeCode(@Body() body: { code: string }) {
    return this.openAIService.analyzeCode(body.code);
  }

  @Post('generate-structure')
  async generateStructure(@Body() body: { description: string }) {
    return this.openAIService.generateProjectStructure(body.description);
  }
}
