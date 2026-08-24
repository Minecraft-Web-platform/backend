import { Body, Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { StatesService } from '../states.service';
import { ModIpGuard } from '../../auth/guards/mod-ip.guard';
import { IsInt, IsNotEmpty } from 'class-validator';

class CreateTerritoryDto {
  @IsInt()
  @IsNotEmpty()
  minX: number;

  @IsInt()
  @IsNotEmpty()
  minY: number;

  @IsInt()
  @IsNotEmpty()
  minZ: number;

  @IsInt()
  @IsNotEmpty()
  maxX: number;

  @IsInt()
  @IsNotEmpty()
  maxY: number;

  @IsInt()
  @IsNotEmpty()
  maxZ: number;
}

@Controller('territories')
export class TerritoriesController {
  constructor(private readonly statesService: StatesService) {}

  @Get()
  async getAllTerritories() {
    return this.statesService.getAllTerritories();
  }

  @Get('bluemap-markers')
  async getBlueMapMarkers(@Query('map') mapName?: string) {
    return this.statesService.getBlueMapMarkers(mapName);
  }

  @UseGuards(ModIpGuard)
  @Post('city/:id')
  async createCityTerritory(
    @Param('id') cityId: string,
    @Body() dto: CreateTerritoryDto
  ) {
    return this.statesService.addCityTerritory(
      cityId,
      dto.minX,
      dto.minY,
      dto.minZ,
      dto.maxX,
      dto.maxY,
      dto.maxZ
    );
  }
}
