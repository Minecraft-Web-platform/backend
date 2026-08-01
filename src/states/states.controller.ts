import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StatesService } from './states.service';
import {
  CreateDecreeDto,
  CreateStateDto,
  SetDiplomacyDto,
  UpdateStateDto,
} from './dto/states.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminGuard } from '../auth/guards/is-admin.guard';
import { AuthenticatedRequest } from '../auth/types/auth-request.type';

@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Get()
  async getAllStates() {
    return this.statesService.getAllStates();
  }

  @Get(':id')
  async getStateById(@Param('id') id: string) {
    return this.statesService.getStateById(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard, AdminGuard)
  async createState(@Body() dto: CreateStateDto) {
    return this.statesService.createState(dto);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async updateState(@Param('id') id: string, @Body() dto: UpdateStateDto) {
    return this.statesService.updateState(id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async deleteState(@Param('id') id: string) {
    return this.statesService.deleteState(id);
  }

  // --- Decrees ---
  @Get(':id/decrees')
  async getDecrees(@Param('id') id: string) {
    return this.statesService.getDecreesForState(id);
  }

  @Post(':id/decrees')
  @UseGuards(AccessTokenGuard)
  async createDecree(
    @Param('id') id: string,
    @Body() dto: CreateDecreeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const authorUsername = req.user?.username_lower || 'Leader';
    return this.statesService.createDecree(id, dto, authorUsername);
  }

  // --- Diplomacy ---
  @Get(':id/diplomacy')
  async getDiplomacy(@Param('id') id: string) {
    return this.statesService.getDiplomacyForState(id);
  }

  @Put(':id/diplomacy')
  @UseGuards(AccessTokenGuard)
  async setDiplomacy(@Param('id') id: string, @Body() dto: SetDiplomacyDto) {
    return this.statesService.setDiplomacy(id, dto);
  }
}
