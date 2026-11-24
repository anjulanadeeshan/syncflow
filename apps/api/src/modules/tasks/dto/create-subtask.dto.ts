import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateSubtaskDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 200)
  title!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  taskVersion!: number;
}
