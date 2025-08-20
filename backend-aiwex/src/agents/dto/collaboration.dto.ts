import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateFeatureWorkflowDto {
  @IsString()
  issueTitle: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  assignedAgents: string[];

  @IsString()
  repository: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];
}

export class CreateSprintDto {
  @IsString()
  projectName: string;

  @IsArray()
  @IsString({ each: true })
  sprintGoals: string[];

  @IsString()
  duration: string;

  @IsArray()
  @IsString({ each: true })
  team: string[];
}

export class MultiAgentReviewDto {
  @IsString()
  repository: string;

  @IsNumber()
  pullRequestNumber: number;

  @IsArray()
  @IsString({ each: true })
  reviewers: string[];
}