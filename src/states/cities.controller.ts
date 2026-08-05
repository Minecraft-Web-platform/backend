import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StatesService } from './states.service';
import {
  CreateCityDto,
  CreateCitizenshipRequestDto,
  ReviewCitizenshipRequestDto,
  UpdateCityDto,
} from './dto/states.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminGuard } from '../auth/guards/is-admin.guard';
import { AuthenticatedRequest } from '../auth/types/auth-request.type';

@Controller('cities')
export class CitiesController {
  constructor(private readonly statesService: StatesService) {}

  @Get()
  async getAllCities(@Query('stateId') stateId?: string) {
    return this.statesService.getAllCities(stateId);
  }

  @Get(':id')
  async getCityById(@Param('id') id: string) {
    return this.statesService.getCityById(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async createCity(
    @Body() dto: CreateCityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.statesService.createCity(dto, req.user?.username_lower);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  async updateCity(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCityDto,
  ) {
    return this.statesService.updateCity(id, dto, req.user?.username_lower);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async deleteCity(@Param('id') id: string) {
    return this.statesService.deleteCity(id);
  }

  // --- Citizenship Requests ---
  @Get(':id/requests')
  async getRequests(@Param('id') id: string) {
    return this.statesService.getRequestsForCity(id);
  }

  @Post(':id/requests')
  @UseGuards(AccessTokenGuard)
  async createRequest(
    @Param('id') id: string,
    @Body() dto: CreateCitizenshipRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const username = req.user?.username_lower || 'Guest';
    return this.statesService.createCitizenshipRequest(username, {
      ...dto,
      cityId: id,
    });
  }

  @Put(':id/requests/:requestId')
  @UseGuards(AccessTokenGuard)
  async reviewRequest(
    @Param('id') _cityId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewCitizenshipRequestDto,
  ) {
    return this.statesService.reviewCitizenshipRequest(requestId, dto);
  }

  @Post(':id/leave')
  @UseGuards(AccessTokenGuard)
  async leaveCity(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.statesService.leaveCity(id, req.user?.username_lower);
  }
}
