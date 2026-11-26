import { IsIn } from 'class-validator';
import { PROJECT_ROLES } from '../project.types.js';
import type { ProjectRoleValue } from '../project.types.js';

export class UpdateProjectMemberRoleDto {
  @IsIn(PROJECT_ROLES)
  role!: ProjectRoleValue;
}
