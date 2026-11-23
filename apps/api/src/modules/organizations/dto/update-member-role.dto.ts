import { IsIn } from 'class-validator';
import {
  ORGANIZATION_ROLES,
  type OrganizationRoleValue,
} from '../organization.types.js';

export class UpdateMemberRoleDto {
  @IsIn(ORGANIZATION_ROLES)
  role!: OrganizationRoleValue;
}
