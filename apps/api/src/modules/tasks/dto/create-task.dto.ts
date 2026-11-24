import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_STATUSES } from '../task.types.js';
import type {
  TaskPriorityValue,
  TaskStatusValue,
} from '../task.types.js';

export class CreateTaskDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 200)
  title!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority: TaskPriorityValue = 'MEDIUM';

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status: TaskStatusValue = 'TODO';

  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsISO8601({ strict: true })
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  assigneeIds: string[] = [];
}
