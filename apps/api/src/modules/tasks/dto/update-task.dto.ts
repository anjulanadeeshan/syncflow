import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_STATUSES } from '../task.types.js';
import type {
  TaskPriorityValue,
  TaskStatusValue,
} from '../task.types.js';

export class UpdateTaskDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(20_000)
  description?: string | null;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriorityValue;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatusValue;

  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsISO8601({ strict: true })
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  assigneeIds?: string[];
}
