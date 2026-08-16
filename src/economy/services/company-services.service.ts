import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CompanyService } from '../entities/company-service.entity';
import { CompanyServiceSubItem } from '../entities/company-service-sub-item.entity';
import { CompanyOrder } from '../entities/company-order.entity';
import { CompanyOrderStatus } from '../entities/company-order-status.enum';
import { CompanyOrderItem } from '../entities/company-order-item.entity';
import { CompanyOrderStatusHistory } from '../entities/company-order-status-history.entity';
import { Company } from '../entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { EconomyService } from './economy.service';
import { StateEntity } from '../../states/entities/state.entity';
import { Account } from '../entities/account.entity';
import { Transfer } from '../entities/transfer.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CompanyServicesService {
  constructor(
    @InjectRepository(CompanyService)
    private readonly serviceRepo: Repository<CompanyService>,
    @InjectRepository(CompanyServiceSubItem)
    private readonly subItemRepo: Repository<CompanyServiceSubItem>,
    @InjectRepository(CompanyOrder)
    private readonly orderRepo: Repository<CompanyOrder>,
    @InjectRepository(CompanyOrderItem)
    private readonly orderItemRepo: Repository<CompanyOrderItem>,
    @InjectRepository(CompanyOrderStatusHistory)
    private readonly statusHistoryRepo: Repository<CompanyOrderStatusHistory>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(StateEntity)
    private readonly stateRepo: Repository<StateEntity>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Transfer)
    private readonly transferRepo: Repository<Transfer>,
    private readonly economyService: EconomyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async getServicesForCompany(companyId: string): Promise<CompanyService[]> {
    return this.serviceRepo.find({
      where: { companyId },
      relations: ['subItems'],
    });
  }

  public async createService(
    companyId: string,
    username: string,
    dto: {
      name: string;
      description?: string;
      isComposite: boolean;
      price: number;
      photoUrls?: string[];
      subItems?: { name: string; description?: string; price: number; photoUrls?: string[]; displayOrder?: number }[];
    },
  ): Promise<CompanyService> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.ownerUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Only company owner can create services');
    }

    const service = this.serviceRepo.create({
      companyId,
      name: dto.name,
      description: dto.description || '',
      isComposite: dto.isComposite,
      price: dto.price,
      photoUrls: dto.photoUrls || [],
    });

    const savedService = await this.serviceRepo.save(service);

    if (dto.isComposite && dto.subItems && dto.subItems.length > 0) {
      const subItems = dto.subItems.map((item) =>
        this.subItemRepo.create({
          serviceId: savedService.id,
          name: item.name,
          description: item.description || '',
          price: item.price,
          photoUrls: item.photoUrls || [],
          displayOrder: item.displayOrder || 0,
        }),
      );
      await this.subItemRepo.save(subItems);
    }

    const result = await this.serviceRepo.findOne({ where: { id: savedService.id }, relations: ['subItems'] });
    if (!result) throw new NotFoundException('Failed to retrieve saved service');
    return result;
  }

  public async updateService(
    companyId: string,
    serviceId: string,
    username: string,
    dto: {
      name: string;
      description?: string;
      isComposite: boolean;
      price: number;
      photoUrls?: string[];
      subItems?: { name: string; description?: string; price: number; photoUrls?: string[]; displayOrder?: number }[];
    },
  ): Promise<CompanyService> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.ownerUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Only company owner can edit services');
    }

    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, companyId },
    });
    if (!service) throw new NotFoundException('Service not found');

    service.name = dto.name;
    service.description = dto.description || '';
    service.isComposite = dto.isComposite;
    service.price = dto.price;
    service.photoUrls = dto.photoUrls || [];

    await this.serviceRepo.save(service);

    // Delete existing sub-items
    await this.subItemRepo.delete({ serviceId: service.id });

    // Create new sub-items if it is composite
    if (dto.isComposite && dto.subItems && dto.subItems.length > 0) {
      const subItems = dto.subItems.map((item) =>
        this.subItemRepo.create({
          serviceId: service.id,
          name: item.name,
          description: item.description || '',
          price: item.price,
          photoUrls: item.photoUrls || [],
          displayOrder: item.displayOrder || 0,
        }),
      );
      await this.subItemRepo.save(subItems);
    }

    const result = await this.serviceRepo.findOne({ where: { id: service.id }, relations: ['subItems'] });
    if (!result) throw new NotFoundException('Failed to retrieve saved service');
    return result;
  }

  public async createOrder(
    username: string,
    dto: {
      companyId: string;
      serviceId: string;
      clientComment?: string;
      subItemIds?: string[]; // for composite service
      payerType?: 'player' | 'company' | 'state';
      payerCompanyId?: string | null;
      payerStateId?: string | null;
    },
  ): Promise<CompanyOrder> {
    const company = await this.companyRepo.findOne({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId },
      relations: ['subItems'],
    });
    if (!service) throw new NotFoundException('Service not found');

    const payerType = dto.payerType || 'player';
    let payerCompanyId: string | null = null;
    let payerStateId: string | null = null;
    let senderAccount: Account | null = null;

    if (payerType === 'company') {
      if (!dto.payerCompanyId) throw new BadRequestException('payerCompanyId is required when payerType is company');
      const payerComp = await this.companyRepo.findOne({ where: { id: dto.payerCompanyId } });
      if (!payerComp) throw new NotFoundException('Payer company not found');
      if (payerComp.ownerUsername.toLowerCase() !== username.toLowerCase()) {
        throw new BadRequestException('You do not have permission to pay on behalf of this company');
      }
      payerCompanyId = payerComp.id;
      senderAccount = await this.accountRepo.findOne({ where: { id: payerComp.accountId as string } });
    } else if (payerType === 'state') {
      if (!dto.payerStateId) throw new BadRequestException('payerStateId is required when payerType is state');
      const payerState = await this.stateRepo.findOne({ where: { id: dto.payerStateId } });
      if (!payerState) throw new NotFoundException('Payer state not found');
      const lower = username.toLowerCase();
      if (payerState.leaderUsername?.toLowerCase() !== lower && payerState.treasurerUsername?.toLowerCase() !== lower) {
        throw new BadRequestException('You do not have permission to pay on behalf of this state');
      }
      payerStateId = payerState.id;
      senderAccount = await this.accountRepo.findOne({ where: { accountNumber: payerState.treasuryAccountNumber } });
    } else {
      senderAccount = await this.accountRepo.findOne({
        where: { ownerUsername: username.toLowerCase(), type: 'personal' },
        order: { createdAt: 'DESC' },
      });
    }

    if (!senderAccount) throw new BadRequestException('Счет отправителя не найден');

    let totalPrice = 0;
    const orderItems: CompanyOrderItem[] = [];

    if (service.isComposite) {
      if (!dto.subItemIds || dto.subItemIds.length === 0) {
        throw new BadRequestException('Composite service requires at least one sub-item');
      }
      totalPrice += service.price; // Base fee

      for (const subItemId of dto.subItemIds) {
        const subItem = service.subItems.find((si) => si.id === subItemId);
        if (!subItem) throw new BadRequestException(`Sub-item ${subItemId} not found in this service`);

        totalPrice += subItem.price;
        orderItems.push(
          this.orderItemRepo.create({
            subItemId: subItem.id,
            name: subItem.name,
            price: subItem.price,
            quantity: 1,
          }),
        );
      }
    } else {
      totalPrice = service.price;
      orderItems.push(
        this.orderItemRepo.create({
          subItemId: null,
          name: service.name,
          price: service.price,
          quantity: 1,
        }),
      );
    }

    const receiverAccount = await this.accountRepo.findOne({ where: { id: company.accountId as string } });
    if (!receiverAccount) throw new BadRequestException('Коммерческий счет компании-исполнителя не найден');

    if (totalPrice > 0) {
      await this.economyService.transferMoney(username, {
        fromNumber: senderAccount.accountNumber,
        toNumber: receiverAccount.accountNumber,
        amount: totalPrice,
        description: `Оплата заказа услуги: ${service.name}`,
      });
    }

    const order = this.orderRepo.create({
      companyId: company.id,
      serviceId: service.id,
      clientUsername: username.toLowerCase(),
      clientComment: dto.clientComment || '',
      payerType,
      payerCompanyId,
      payerStateId,
      totalPrice,
      status: CompanyOrderStatus.NEW,
    });

    const savedOrder = await this.orderRepo.save(order);

    for (const item of orderItems) {
      item.orderId = savedOrder.id;
    }
    await this.orderItemRepo.save(orderItems);

    await this.statusHistoryRepo.save(
      this.statusHistoryRepo.create({
        orderId: savedOrder.id,
        status: CompanyOrderStatus.NEW,
        changedByUsername: username.toLowerCase(),
        comment: 'Order placed',
      }),
    );

    const result = await this.orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'statusHistory'],
    });
    if (!result) throw new NotFoundException('Failed to retrieve saved order');
    return result;
  }

  public async getOrdersForCompany(companyId: string, username: string): Promise<CompanyOrder[]> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.ownerUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Only company owner can view orders');
    }

    return this.orderRepo.find({
      where: { companyId },
      relations: ['items', 'statusHistory', 'service'],
      order: { createdAt: 'DESC' },
    });
  }

  public async getClientOrders(username: string): Promise<CompanyOrder[]> {
    return this.orderRepo.find({
      where: { clientUsername: username.toLowerCase() },
      relations: ['items', 'statusHistory', 'company', 'service'],
      order: { createdAt: 'DESC' },
    });
  }

  public async updateOrderStatus(
    orderId: string,
    username: string,
    status: CompanyOrderStatus,
    comment?: string,
  ): Promise<CompanyOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['company'] });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.company.ownerUsername.toLowerCase() === username.toLowerCase();
    const isClient = order.clientUsername.toLowerCase() === username.toLowerCase();

    if (!isOwner && !isClient) {
      // NOTE: President logic would go here if we verify user role
      // For now, allow if it's disputed/refunded logic maybe?
      // Just check owner/client for normal flow
    }

    // A lot of specific state machine logic could be implemented here
    // e.g. only owner can mark IN_PROGRESS or COMPLETED
    // client can mark DISPUTED

    order.status = status;
    await this.orderRepo.save(order);

    await this.statusHistoryRepo.save(
      this.statusHistoryRepo.create({
        orderId: order.id,
        status,
        changedByUsername: username.toLowerCase(),
        comment: comment || 'Status changed',
      }),
    );

    if (status === CompanyOrderStatus.DISPUTED && isClient) {
      this.eventEmitter.emit('company.order.disputed', { initiatorUsername: username.toLowerCase() });
    }

    const result = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items', 'statusHistory'] });
    if (!result) throw new NotFoundException('Order not found after update');
    return result;
  }

  public async arbitrateOrder(
    username: string,
    orderId: string,
    dto: {
      decision: 'REFUND' | 'REJECT';
      comment: string;
      finePercent?: number; // 0 to 100
    },
  ): Promise<CompanyOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['company'],
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== CompanyOrderStatus.DISPUTED) {
      throw new BadRequestException('Can only arbitrate DISPUTED orders');
    }

    const user = await this.userRepo.findOne({ where: { username_lower: username.toLowerCase() } });
    const isAdmin = user?.isAdmin || false;

    if (order.isEscalatedToAdmin && !isAdmin) {
      throw new BadRequestException('This order has been escalated to an administrator');
    }

    if (!order.company.stateId) {
      throw new BadRequestException('Company does not belong to a state');
    }
    const state = await this.stateRepo.findOne({ where: { id: order.company.stateId } });
    if (!state) {
      throw new BadRequestException('Company state not found');
    }

    if (!order.isEscalatedToAdmin && !isAdmin) {
      if (state.leaderUsername?.toLowerCase() !== username.toLowerCase()) {
        throw new BadRequestException('Only the president (leader) can arbitrate');
      }
    }

    if (isAdmin) {
      order.adminDecision = dto.decision;
      order.adminComment = dto.comment;
    }

    if (dto.decision === 'REJECT') {
      order.status = CompanyOrderStatus.COMPLETED; // return to completed if rejected
      await this.orderRepo.save(order);
      await this.statusHistoryRepo.save(
        this.statusHistoryRepo.create({
          orderId: order.id,
          status: CompanyOrderStatus.COMPLETED,
          changedByUsername: username.toLowerCase(),
          comment: `[${isAdmin ? 'Admin' : 'President'} Decision]: Rejected dispute. ${dto.comment}`,
        }),
      );
    } else {
      // REFUND
      order.status = CompanyOrderStatus.REFUNDED;
      await this.orderRepo.save(order);

      const refundAmount = order.totalPrice;
      const currency = await this.economyService.getCurrencyForState(state.id);

      // find company account
      const companyAccount = order.company.accountId
        ? await this.accountRepo.findOne({ where: { id: order.company.accountId } })
        : null;
      const clientAccount = await this.accountRepo.findOne({
        where: { ownerUsername: order.clientUsername.toLowerCase(), type: 'personal', currencyCode: currency.code },
      });

      if (companyAccount && clientAccount) {
        if (companyAccount.balance >= refundAmount) {
          companyAccount.balance = Number((companyAccount.balance - refundAmount).toFixed(2));
          clientAccount.balance = Number((clientAccount.balance + refundAmount).toFixed(2));
          await this.accountRepo.save([companyAccount, clientAccount]);

          await this.transferRepo.save(
            this.transferRepo.create({
              fromAccountNumber: companyAccount.accountNumber,
              toAccountNumber: clientAccount.accountNumber,
              amount: refundAmount,
              currencyCode: currency.code,
              taxAmount: 0,
              description: `Refund for order ${order.id}`,
            }),
          );
        } else {
          throw new BadRequestException('Company does not have enough balance for refund');
        }
      }

      if (dto.finePercent && dto.finePercent > 0) {
        const percent = Math.min(dto.finePercent, 100);
        const fineAmount = Number(((order.totalPrice * percent) / 100).toFixed(2));
        const stateTreasuryAccount = state.treasuryAccountNumber
          ? await this.accountRepo.findOne({ where: { accountNumber: state.treasuryAccountNumber } })
          : null;

        if (companyAccount && stateTreasuryAccount) {
          if (companyAccount.balance >= fineAmount) {
            companyAccount.balance = Number((companyAccount.balance - fineAmount).toFixed(2));
            stateTreasuryAccount.balance = Number((stateTreasuryAccount.balance + fineAmount).toFixed(2));
            await this.accountRepo.save([companyAccount, stateTreasuryAccount]);

            await this.transferRepo.save(
              this.transferRepo.create({
                fromAccountNumber: companyAccount.accountNumber,
                toAccountNumber: stateTreasuryAccount.accountNumber,
                amount: fineAmount,
                currencyCode: currency.code,
                taxAmount: 0,
                description: `Fine for order ${order.id}`,
              }),
            );
          }
        }
      }

      await this.statusHistoryRepo.save(
        this.statusHistoryRepo.create({
          orderId: order.id,
          status: CompanyOrderStatus.REFUNDED,
          changedByUsername: username.toLowerCase(),
          comment: `[${isAdmin ? 'Admin' : 'President'} Decision]: Refunded to client. ${dto.comment}`,
        }),
      );
    }

    const result = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'statusHistory', 'service'],
    });
    if (!result) throw new NotFoundException('Order not found after arbitrate');
    return result;
  }

  public async escalateOrder(username: string, orderId: string, comment: string): Promise<CompanyOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['company'],
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== CompanyOrderStatus.REFUNDED && order.status !== CompanyOrderStatus.COMPLETED) {
      throw new BadRequestException('Can only escalate orders that have been arbitrated');
    }
    if (order.isEscalatedToAdmin) {
      throw new BadRequestException('Order is already escalated');
    }

    // Check if username is client or company owner
    const isClient = order.payerType === 'player' && order.clientUsername.toLowerCase() === username.toLowerCase();
    // Simplified company owner check for now
    const isCompanyOwner = order.company.ownerUsername.toLowerCase() === username.toLowerCase();
    // Simplified state check
    const isState = false; // State payer check omitted for brevity in escalate

    if (!isClient && !isCompanyOwner && !isState) {
      // Just allow them if they are clientUsername
      if (order.clientUsername.toLowerCase() !== username.toLowerCase()) {
        throw new BadRequestException('You do not have permission to escalate this order');
      }
    }

    order.status = CompanyOrderStatus.DISPUTED;
    order.isEscalatedToAdmin = true;
    await this.orderRepo.save(order);

    await this.statusHistoryRepo.save(
      this.statusHistoryRepo.create({
        orderId: order.id,
        status: CompanyOrderStatus.DISPUTED,
        changedByUsername: username.toLowerCase(),
        comment: `[Escalation]: ${comment}`,
      }),
    );

    this.eventEmitter.emit('company.order.escalated', { initiatorUsername: username.toLowerCase() });

    return this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'statusHistory', 'service'],
    }) as Promise<CompanyOrder>;
  }

  public async getDisputedOrders(username: string): Promise<CompanyOrder[]> {
    const lower = username.toLowerCase();

    const user = await this.userRepo.findOne({ where: { username_lower: lower } });
    const isAdmin = user?.isAdmin || false;

    if (isAdmin) {
      return this.orderRepo.find({
        where: { status: CompanyOrderStatus.DISPUTED, isEscalatedToAdmin: true },
        relations: ['company', 'service', 'statusHistory'],
        order: { createdAt: 'DESC' },
      });
    }

    const states = await this.stateRepo
      .createQueryBuilder('state')
      .where('LOWER(state.leaderUsername) = :lower', { lower })
      .getMany();

    if (states.length === 0) return [];

    const stateIds = states.map((s) => s.id);
    const companies = await this.companyRepo
      .createQueryBuilder('company')
      .where('company.stateId IN (:...stateIds)', { stateIds })
      .getMany();

    if (companies.length === 0) return [];

    const companyIds = companies.map((c) => c.id);

    return this.orderRepo.find({
      where: {
        status: CompanyOrderStatus.DISPUTED,
        isEscalatedToAdmin: false,
        companyId: In(companyIds),
      },
      relations: ['company', 'service', 'statusHistory'],
      order: { createdAt: 'DESC' },
    });
  }

  public async getMyIdentities(username: string): Promise<Array<{ type: string; id: string; label: string }>> {
    const lower = username.toLowerCase();

    const identities = [{ type: 'player', id: lower, label: 'Личный счет' }];

    const states = await this.stateRepo
      .createQueryBuilder('state')
      .where('LOWER(state.leaderUsername) = :lower OR LOWER(state.treasurerUsername) = :lower', { lower })
      .getMany();
    for (const st of states) {
      identities.push({ type: 'state', id: st.id, label: `Казна ${st.name}` });
    }

    const companies = await this.companyRepo
      .createQueryBuilder('company')
      .where('LOWER(company.ownerUsername) = :lower', { lower })
      .getMany();
    for (const comp of companies) {
      identities.push({ type: 'company', id: comp.id, label: `Счет компании ${comp.name}` });
    }

    return identities;
  }
}
