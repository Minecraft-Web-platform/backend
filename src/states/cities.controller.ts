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
  UnauthorizedException,
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

import { AuthenticatedRequest } from '../auth/types/auth-request.type';
import { CitiesService } from './services/cities.service';

@Controller('cities')
export class CitiesController {
  constructor(
    private readonly statesService: StatesService,
    private readonly citiesService: CitiesService,
  ) {}

  @Get()
  async getAllCities(@Query('stateId') stateId?: string) {
    return this.citiesService.getAllCities(stateId);
  }

  @Get(':id')
  async getCityById(@Param('id') id: string) {
    return this.citiesService.getCityById(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async createCity(@Body() dto: CreateCityDto, @Req() req: AuthenticatedRequest) {
    return this.citiesService.createCity(dto, req.user?.username_lower);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  async updateCity(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.citiesService.updateCity(id, dto, req.user?.username_lower);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  async deleteCity(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.citiesService.deleteCity(id, req.user?.username_lower);
  }

  @Post(':id/resign')
  @UseGuards(AccessTokenGuard)
  async resignMayor(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user?.username_lower) {
      throw new UnauthorizedException();
    }
    return this.citiesService.resignMayor(id, req.user.username_lower);
  }

  @Post(':id/capital')
  @UseGuards(AccessTokenGuard)
  async setCapital(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.citiesService.setCityCapital(id, req.user?.username_lower);
  }

  @Post(':id/images')
  @UseGuards(AccessTokenGuard)
  async addImage(@Param('id') id: string, @Body('imageUrl') imageUrl: string, @Req() req: AuthenticatedRequest) {
    return this.citiesService.addCityImage(id, imageUrl, req.user?.username_lower);
  }

  @Delete(':id/images')
  @UseGuards(AccessTokenGuard)
  async removeImage(@Param('id') id: string, @Body('imageUrl') imageUrl: string, @Req() req: AuthenticatedRequest) {
    return this.citiesService.removeCityImage(id, imageUrl, req.user?.username_lower);
  }

  // --- Citizenship Requests ---
  @Get(':id/requests')
  async getRequests(@Param('id') id: string) {
    return this.citiesService.getRequestsForCity(id);
  }

  @Post(':id/requests')
  @UseGuards(AccessTokenGuard)
  async createRequest(
    @Param('id') id: string,
    @Body() dto: CreateCitizenshipRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const username = req.user?.username_lower || 'Guest';
    return this.citiesService.createCitizenshipRequest(username, {
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
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user?.username_lower) {
      throw new UnauthorizedException();
    }
    return this.citiesService.reviewCitizenshipRequest(requestId, dto, req.user.username_lower);
  }

  @Post(':id/leave')
  @UseGuards(AccessTokenGuard)
  async leaveCity(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.citiesService.leaveCity(id, req.user?.username_lower);
  }
}
