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
  CreateSettlementDto,
  CreateCitizenshipRequestDto,
  ReviewCitizenshipRequestDto,
  UpdateSettlementDto,
} from './dto/states.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';

import { AuthenticatedRequest } from '../auth/types/auth-request.type';
import { SettlementsService } from './services/settlements.service';

@Controller('settlements')
export class SettlementsController {
  constructor(
    private readonly statesService: StatesService,
    private readonly settlementsService: SettlementsService,
  ) {}

  // --- Settlement Types ---
  @Get('types')
  async getSettlementTypes(@Query('all') all?: string) {
    return this.settlementsService.getSettlementTypes(all === 'true');
  }

  @Post('types')
  @UseGuards(AccessTokenGuard)
  async proposeSettlementType(@Body('name') name: string, @Req() req: AuthenticatedRequest) {
    if (!name || name.trim().length < 3) throw new UnauthorizedException('Название должно быть от 3 символов');
    return this.settlementsService.proposeSettlementType(name.trim(), req.user?.username_lower || 'Guest');
  }

  @Put('types/:id/moderate')
  @UseGuards(AccessTokenGuard)
  async moderateSettlementType(
    @Param('id') id: string,
    @Body('isApproved') isApproved: boolean,
    @Req() req: AuthenticatedRequest
  ) {
    // isAdmin check moved to service
    return this.settlementsService.moderateSettlementType(id, isApproved, req.user.username_lower);
  }

  // --- Settlements ---
  @Get()
  async getAllSettlements(@Query('stateId') stateId?: string) {
    return this.settlementsService.getAllSettlements(stateId);
  }

  @Get(':id')
  async getSettlementById(@Param('id') id: string) {
    return this.settlementsService.getSettlementById(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async createSettlement(@Body() dto: CreateSettlementDto, @Req() req: AuthenticatedRequest) {
    return this.settlementsService.createSettlement(dto, req.user?.username_lower);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  async updateSettlement(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateSettlementDto) {
    return this.settlementsService.updateSettlement(id, dto, req.user?.username_lower);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  async deleteSettlement(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.settlementsService.deleteSettlement(id, req.user?.username_lower);
  }

  @Post(':id/resign')
  @UseGuards(AccessTokenGuard)
  async resignMayor(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user?.username_lower) {
      throw new UnauthorizedException();
    }
    return this.settlementsService.resignMayor(id, req.user.username_lower);
  }

  @Post(':id/capital')
  @UseGuards(AccessTokenGuard)
  async setCapital(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.settlementsService.setSettlementCapital(id, req.user?.username_lower);
  }

  @Post(':id/images')
  @UseGuards(AccessTokenGuard)
  async addImage(@Param('id') id: string, @Body('imageUrl') imageUrl: string, @Req() req: AuthenticatedRequest) {
    return this.settlementsService.addSettlementImage(id, imageUrl, req.user?.username_lower);
  }

  @Delete(':id/images')
  @UseGuards(AccessTokenGuard)
  async removeImage(@Param('id') id: string, @Body('imageUrl') imageUrl: string, @Req() req: AuthenticatedRequest) {
    return this.settlementsService.removeSettlementImage(id, imageUrl, req.user?.username_lower);
  }

  // --- Citizenship Requests ---
  @Get(':id/requests')
  async getRequests(@Param('id') id: string) {
    return this.settlementsService.getRequestsForSettlement(id);
  }

  @Post(':id/requests')
  @UseGuards(AccessTokenGuard)
  async createRequest(
    @Param('id') id: string,
    @Body() dto: CreateCitizenshipRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const username = req.user?.username_lower || 'Guest';
    return this.settlementsService.createCitizenshipRequest(username, {
      ...dto,
      settlementId: id,
    });
  }

  @Put(':id/requests/:requestId')
  @UseGuards(AccessTokenGuard)
  async reviewRequest(
    @Param('id') _settlementId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewCitizenshipRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user?.username_lower) {
      throw new UnauthorizedException();
    }
    return this.settlementsService.reviewCitizenshipRequest(requestId, dto, req.user.username_lower);
  }

  @Post(':id/leave')
  @UseGuards(AccessTokenGuard)
  async leaveSettlement(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.settlementsService.leaveSettlement(id, req.user?.username_lower);
  }
}
