import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMySettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsIn(['Compact', 'Comfortable'])
  density?: string;

  @IsOptional()
  @IsIn(['dark', 'light'])
  appearance?: string;

  @IsOptional()
  @IsBoolean()
  autosave?: boolean;

  @IsOptional()
  @IsBoolean()
  twoFactor?: boolean;
}
