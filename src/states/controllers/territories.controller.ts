import { Body, Controller, Get, Param, Post, Delete, Patch, UseGuards, Query, Req,  } from '@nestjs/common';
import { ModIpGuard } from '../../auth/guards/mod-ip.guard';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { IsInt, IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { TerritoriesService } from '../services/territories.service';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';

class CreateTerritoryDto {
  @IsInt() @IsNotEmpty() minX: number;
  @IsInt() @IsNotEmpty() minY: number;
  @IsInt() @IsNotEmpty() minZ: number;
  @IsInt() @IsNotEmpty() maxX: number;
  @IsInt() @IsNotEmpty() maxY: number;
  @IsInt() @IsNotEmpty() maxZ: number;
  
  @IsString() @IsNotEmpty() ownerType: 'player' | 'company' | 'settlement' | 'state';
  @IsString() @IsNotEmpty() ownerId: string;
  @IsString() @IsNotEmpty() settlementId: string;
}

class ToggleVisibilityDto {
  @IsBoolean() @IsNotEmpty() isHiddenOnMap: boolean;
}

@Controller('territories')
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  @Get()
  async getAllTerritories() {
    return this.territoriesService.getAllTerritories();
  }

  @Get('profiles/:username')
  async getProfilesForPlayer(@Param('username') username: string) {
    return this.territoriesService.getProfilesForPlayer(username);
  }

  @Get('surveyor-data/:username')
  async getSurveyorData(@Param('username') username: string) {
    return this.territoriesService.getSurveyorDataForPlayer(username);
  }

  @Get('bluemap-markers')
  async getBlueMapMarkers(@Query('map') mapName?: string) {
    return this.territoriesService.getBlueMapMarkers(mapName);
  }

  @UseGuards(ModIpGuard)
  @Post()
  async createTerritory(@Body() dto: CreateTerritoryDto) {
    return this.territoriesService.addTerritory(dto);
  }

  @UseGuards(ModIpGuard)
  @Delete('ingame/:id')
  async deleteTerritoryInGame(@Param('id') territoryId: string) {
    return this.territoriesService.deleteTerritoryMod(territoryId);
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  async deleteTerritoryWeb(@Req() req: AuthenticatedRequest, @Param('id') territoryId: string) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.territoriesService.deleteTerritoryWeb(territoryId, (req as any).user);
  }

  @UseGuards(AccessTokenGuard)
  @Patch(':id/visibility')
  async toggleVisibility(@Req() req: AuthenticatedRequest, @Param('id') territoryId: string, @Body() dto: ToggleVisibilityDto) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.territoriesService.toggleVisibility(territoryId, dto.isHiddenOnMap, (req as any).user);
  }
}

