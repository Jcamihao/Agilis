import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(8)
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsString()
  @MinLength(1)
  FRONTEND_URL!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
