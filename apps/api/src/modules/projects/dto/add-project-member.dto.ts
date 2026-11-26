import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PROJECT_ROLES } from '../project.types.js';
import type { ProjectRoleValue } from '../project.types.js';

export class AddProjectMemberDto {
  @IsUUID('4')
  userId!: string;

  @IsOptional()
  @IsIn(PROJECT_ROLES)
  role: ProjectRoleValue = 'MEMBER';
}
