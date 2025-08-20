import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { OpenAIController } from './openai.controller';

@Module({
  controllers: [OpenAIController],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}