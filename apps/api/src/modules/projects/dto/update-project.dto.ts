import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateProjectDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z][A-Z0-9]*$/, {
    message: 'key must start with a letter and contain only uppercase letters and numbers',
  })
  key?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(10_000)
  description?: string | null;
}
