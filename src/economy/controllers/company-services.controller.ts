import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { CompanyServicesService } from '../services/company-services.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';
import { CompanyOrderStatus } from '../entities/company-order-status.enum';

@Controller('company-services')
export class CompanyServicesController {
  constructor(private readonly servicesService: CompanyServicesService) { }

  @Get('identities')
  @UseGuards(AccessTokenGuard)
  async getMyIdentities(@Req() req: AuthenticatedRequest) {
    return this.servicesService.getMyIdentities(req.user.username_lower);
  }

  @Get('company/:companyId')
  async getCompanyServices(@Param('companyId') companyId: string) {
    return this.servicesService.getServicesForCompany(companyId);
  }

  @Post('company/:companyId')
  @UseGuards(AccessTokenGuard)
  async createService(
    @Param('companyId') companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      name: string;
      description?: string;
      isComposite: boolean;
      price: number;
      photoUrls?: string[];
      subItems?: { name: string; description?: string; price: number; photoUrls?: string[]; displayOrder?: number }[];
    }
  ) {
    return this.servicesService.createService(companyId, req.user.username_lower, dto);
  }

  @Put('company/:companyId/service/:serviceId')
  @UseGuards(AccessTokenGuard)
  async updateService(
    @Param('companyId') companyId: string,
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      name: string;
      description?: string;
      isComposite: boolean;
      price: number;
      photoUrls?: string[];
      subItems?: { name: string; description?: string; price: number; photoUrls?: string[]; displayOrder?: number }[];
    }
  ) {
    return this.servicesService.updateService(companyId, serviceId, req.user.username_lower, dto);
  }

  @Get('company/:companyId/orders')
  @UseGuards(AccessTokenGuard)
  async getCompanyOrders(@Param('companyId') companyId: string, @Req() req: AuthenticatedRequest) {
    return this.servicesService.getOrdersForCompany(companyId, req.user.username_lower);
  }

  @Get('client/orders')
  @UseGuards(AccessTokenGuard)
  async getClientOrders(@Req() req: AuthenticatedRequest) {
    return this.servicesService.getClientOrders(req.user.username_lower);
  }

  @Post('order')
  @UseGuards(AccessTokenGuard)
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      companyId: string;
      serviceId: string;
      clientComment?: string;
      subItemIds?: string[];
      payerType?: 'player' | 'company' | 'state';
      payerCompanyId?: string | null;
      payerStateId?: string | null;
    }
  ) {
    return this.servicesService.createOrder(req.user.username_lower, dto);
  }

  @Put('order/:orderId/status')
  @UseGuards(AccessTokenGuard)
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: { status: CompanyOrderStatus; comment?: string }
  ) {
    return this.servicesService.updateOrderStatus(orderId, req.user.username_lower, dto.status, dto.comment);
  }

  @Put('order/:orderId/arbitrate')
  @UseGuards(AccessTokenGuard)
  async arbitrateOrder(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: { decision: 'REFUND' | 'REJECT'; comment: string; finePercent?: number }
  ) {
    return this.servicesService.arbitrateOrder(req.user.username_lower, orderId, dto);
  }

  @Put('order/:orderId/escalate')
  @UseGuards(AccessTokenGuard)
  async escalateOrder(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: { comment: string }
  ) {
    return this.servicesService.escalateOrder(req.user.username_lower, orderId, dto.comment);
  }

  @Get('orders/disputed')
  @UseGuards(AccessTokenGuard)
  async getDisputedOrders(@Req() req: AuthenticatedRequest) {
    return this.servicesService.getDisputedOrders(req.user.username_lower);
  }
}
