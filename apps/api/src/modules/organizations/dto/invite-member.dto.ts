import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import {
  ORGANIZATION_ROLES,
  type OrganizationRoleValue,
} from '../organization.types.js';

export class InviteMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(ORGANIZATION_ROLES)
  role!: OrganizationRoleValue;

  @IsOptional()
  @IsIn(['LINK', 'EMAIL'])
  delivery?: 'LINK' | 'EMAIL';
}
