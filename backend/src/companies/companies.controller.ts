import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('companies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empresas do usuário' })
  findAll(@CurrentUser('id') userId: string) {
    return this.companiesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.companiesService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova empresa' })
  create(@Body() dto: CreateCompanyDto, @CurrentUser('id') userId: string) {
    return this.companiesService.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar empresa' })
  update(@Param('id') id: string, @Body() dto: CreateCompanyDto, @CurrentUser('id') userId: string) {
    return this.companiesService.update(id, dto, userId);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Estatísticas do dashboard' })
  getDashboard(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.companiesService.getDashboardStats(id, userId);
  }
}
