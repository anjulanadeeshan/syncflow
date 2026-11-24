import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TASK_PRIORITIES, TASK_STATUSES } from '../task.types.js';
import type {
  TaskPriorityValue,
  TaskStatusValue,
} from '../task.types.js';

export class TaskPaginationDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriorityValue;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatusValue;
}
