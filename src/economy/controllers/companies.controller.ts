import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from '../services/companies.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';

@Controller('economy/companies')
@UseGuards(AccessTokenGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async getAllCompanies(
    @Query('cityId') cityId?: string,
    @Query('stateId') stateId?: string,
  ) {
    return this.companiesService.getAllCompanies({ cityId, stateId });
  }

  @Get(':id')
  async getCompanyById(@Param('id') id: string) {
    return this.companiesService.getCompanyById(id);
  }

  @Post()
  async createCompany(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      description?: string;
      logoUrl?: string;
      cityId?: string;
      stateId?: string;
    },
  ) {
    const username = req.user.username_lower;
    return this.companiesService.createCompany(username, body);
  }
}
