import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsModule } from './agents/agents.module';
import { OpenAIModule } from './openai/openai.module';
import { GithubModule } from './github/github.module';
import { WebsocketModule } from './websocket/websocket.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AgentsModule,
    OpenAIModule,
    GithubModule,
    WebsocketModule,
    UsersModule,
    ProjectsModule,
  ],
})
export class AppModule {}