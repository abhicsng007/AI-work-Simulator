import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsIn(['create-api', 'create-frontend', 'fix-bug', 'add-feature', 'refactor'])
  @IsNotEmpty()
  taskType: 'create-api' | 'create-frontend' | 'fix-bug' | 'add-feature' | 'refactor';

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsString()
  @IsNotEmpty()
  language: string;
}