import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

// companyId/teamId/teamIds não mudam por aqui: projeto não troca de empresa e as equipes só entram na criação.
export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['companyId', 'teamId', 'teamIds'] as const)) {}
