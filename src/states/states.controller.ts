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
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { StatesService } from './states.service';
import { CreateDecreeDto, CreateStateDto, SetDiplomacyDto, UpdateStateDto } from './dto/states.dto';
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
  @UseGuards(AccessTokenGuard)
  async createState(@Req() req: AuthenticatedRequest, @Body() dto: CreateStateDto) {
    return this.statesService.createState(dto, req.user.username_lower);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  async updateState(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateStateDto) {
    return this.statesService.updateState(id, dto, req.user.username_lower);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async deleteState(@Param('id') id: string) {
    return this.statesService.deleteState(id);
  }

  @Post(':id/resign')
  @UseGuards(AccessTokenGuard)
  async resignPresident(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user?.username_lower) {
      throw new UnauthorizedException();
    }
    return this.statesService.resignPresident(id, req.user.username_lower);
  }

  @Post(':id/roles')
  @UseGuards(AccessTokenGuard)
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: { treasurerUsername?: string; voivodeUsername?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user?.username_lower) {
      throw new UnauthorizedException();
    }
    return this.statesService.assignRoles(id, dto, req.user.username_lower);
  }

  // --- Decrees ---
  @Get(':id/decrees')
  async getDecrees(@Param('id') id: string) {
    return this.statesService.getDecreesForState(id);
  }

  @Post(':id/decrees')
  @UseGuards(AccessTokenGuard)
  async createDecree(@Param('id') id: string, @Body() dto: CreateDecreeDto, @Req() req: AuthenticatedRequest) {
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

  // --- National Bank ---
  @Post(':id/bank')
  @UseGuards(AccessTokenGuard)
  async createNationalBank(@Param('id') id: string, @Body() dto: { name?: string }, @Req() req: AuthenticatedRequest) {
    const username = req.user?.username_lower || '';
    return this.statesService.createNationalBank(id, username, dto?.name);
  }

  // --- Treasury ---
  @Get(':id/treasury')
  async getTreasury(@Param('id') id: string) {
    return this.statesService.getStateTreasury(id);
  }

  @Post(':id/treasury/digitize')
  @UseGuards(AccessTokenGuard)
  async digitizeTreasury(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const state = await this.statesService.getStateById(id);
    if (!state.leaderUsername || state.leaderUsername.toLowerCase() !== req.user?.username_lower) {
      throw new ForbiddenException('Только лидер государства может оцифровать казну');
    }
    return this.statesService.digitizeTreasury(id, 'state_reserve');
  }


}
