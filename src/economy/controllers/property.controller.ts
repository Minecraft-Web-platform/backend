import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PropertyService, CreatePropertyDto, UpdatePropertyDto } from '../services/property.service';
import { PropertyOwnerType } from '../entities/property.entity';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';

@Controller('economy/properties')
@UseGuards(AccessTokenGuard)
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get('market')
  getMarketProperties(@Query('stateId') stateId: string) {
    return this.propertyService.getMarketProperties(stateId);
  }

  @Get('owner/:ownerId')
  getPropertiesByOwner(@Param('ownerId') ownerId: string) {
    return this.propertyService.getPropertiesByOwner(ownerId);
  }

  @Get('my')
  getMyProperties(@Request() req) {
    const username = req.user.username_lower;
    const uuid = req.user.uuid;
    return this.propertyService.getMyProperties(username, uuid);
  }

  @Get(':id')
  getPropertyById(@Param('id') id: string) {
    return this.propertyService.getPropertyById(id);
  }

  @Post()
  createProperty(@Body() dto: CreatePropertyDto, @Request() req) {
    const username = req.user.username_lower;
    return this.propertyService.createProperty(username, dto);
  }

  @Patch(':id')
  updateProperty(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @Request() req) {
    const username = req.user.username_lower;
    return this.propertyService.updateProperty(id, dto, username);
  }

  @Post(':id/sell')
  listPropertyForSale(
    @Param('id') id: string,
    @Body('price') price: number,
    @Body('forSaleToId') forSaleToId: string | undefined,
    @Request() req
  ) {
    const username = req.user.username_lower;
    return this.propertyService.listPropertyForSale(username, id, price, forSaleToId);
  }

  @Get(':id/eligible-buyers')
  getEligibleBuyers(@Param('id') id: string) {
    return this.propertyService.getEligibleBuyers(id);
  }

  @Post(':id/cancel-sell')
  cancelListing(@Param('id') id: string, @Request() req) {
    const username = req.user.username_lower;
    return this.propertyService.cancelListing(username, id);
  }

  @Post(':id/buy')
  buyProperty(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
    @Body('newOwnerType') newOwnerType: PropertyOwnerType,
    @Request() req,
  ) {
    const username = req.user.username_lower;
    return this.propertyService.buyProperty(username, id, newOwnerId, newOwnerType);
  }
}
