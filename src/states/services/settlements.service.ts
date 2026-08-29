import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { SettlementEntity } from '../entities/settlement.entity';
import { SettlementTypeEntity } from '../entities/settlement-type.entity';
import { CitizenshipRequestEntity } from '../entities/citizenship-request.entity';
import { User } from '../../users/entities/user.entity';
import { EventsService } from '../../events/events.service';
import { AutoNewsService } from '../../news/auto-news.service';
import {
  CreateSettlementDto,
  UpdateSettlementDto,
  CreateCitizenshipRequestDto,
  ReviewCitizenshipRequestDto,
} from '../dto/states.dto';
import { UnauthorizedException } from '@nestjs/common';
import { StatesService } from '../states.service';
import { TerritoriesService } from './territories.service';
import { ElectionsService } from './elections.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(CitizenshipRequestEntity)
    private readonly requestRepo: Repository<CitizenshipRequestEntity>,
    @InjectRepository(SettlementTypeEntity)
    private readonly subtypeRepo: Repository<SettlementTypeEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventsService: EventsService,
    private readonly autoNewsService: AutoNewsService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => StatesService)) private readonly statesService: StatesService,
    @Inject(forwardRef(() => TerritoriesService)) private readonly territoriesService: TerritoriesService,
    @Inject(forwardRef(() => ElectionsService)) private readonly electionsService: ElectionsService,
  ) {}

  async getAllSettlements(stateId?: string): Promise<SettlementEntity[]> {
    const where = stateId ? { stateId } : {};
    return this.settlementRepo.find({
      where,
      relations: ['state', 'citizens'],
      order: { name: 'ASC' },
    });
  }

  async getSettlementById(id: string): Promise<SettlementEntity> {
    const settlement = await this.settlementRepo.findOne({
      where: { id },
      relations: ['state', 'citizens', 'citizenshipRequests'],
    });
    if (!settlement) {
      throw new NotFoundException('Поселение не найден');
    }

    return settlement;
  }

  async createSettlement(dto: CreateSettlementDto, creatorUsername?: string): Promise<SettlementEntity> {
    const existing = await this.settlementRepo
      .createQueryBuilder('settlement')
      .where('LOWER(settlement.name) = LOWER(:name)', { name: dto.name })
      .getOne();
    if (existing) {
      throw new BadRequestException('Поселение с таким названием уже существует');
    }

    if (dto.status === 'capital' && dto.stateId) {
      const existingCapital = await this.settlementRepo.findOne({
        where: { stateId: dto.stateId, status: 'capital' },
      });
      if (existingCapital) {
        throw new BadRequestException('В этом государстве уже есть столица');
      }
    }

    const mayor = dto.mayorUsername || creatorUsername;
    const settlement = this.settlementRepo.create({
      ...dto,
      mayorUsername: mayor,
      status: dto.status || 'settlement',
      centerX: dto.centerX || 0,
      centerZ: dto.centerZ || 0,
    });
    const saved = await this.settlementRepo.save(settlement);
    if (creatorUsername) {
      this.eventEmitter.emit('settlement.created', {
        initiatorUsername: creatorUsername,
        settlementId: saved.id,
      });
      if (saved.stateId) this.eventEmitter.emit('state.settlement.updated', { stateId: saved.stateId });
    }

    return saved;
  }

  async updateSettlement(id: string, dto: UpdateSettlementDto, username?: string): Promise<SettlementEntity> {
    const settlement = await this.getSettlementById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = settlement.mayorUsername && settlement.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        settlement.state?.leaderUsername && settlement.state.leaderUsername.toLowerCase() === username.toLowerCase();
      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException(
          'Только мэр поселения, президент государства или администратор могут редактировать поселение',
        );
      }
    }

    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        settlement[key] = dto[key];
      }
    });
    const updated = await this.settlementRepo.save(settlement);
    if (updated.stateId) this.eventEmitter.emit('state.settlement.updated', { stateId: updated.stateId });
    this.territoriesService.invalidateBlueMapCache();
    return updated;
  }

  async deleteSettlement(id: string, username?: string): Promise<void> {
    const settlement = await this.getSettlementById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = settlement.mayorUsername && settlement.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        settlement.state?.leaderUsername && settlement.state.leaderUsername.toLowerCase() === username.toLowerCase();

      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException('Только мэр, президент или администратор могут удалить поселение');
      }
    }

    const stateId = settlement.stateId;
    const result = await this.settlementRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Поселение не найден');
    }

    if (stateId) this.eventEmitter.emit('state.settlement.updated', { stateId });
    this.territoriesService.invalidateBlueMapCache();
  }

  async setSettlementCapital(id: string, username: string): Promise<SettlementEntity> {
    const settlement = await this.getSettlementById(id);
    if (!settlement.stateId) {
      throw new BadRequestException('Поселение не принадлежит ни одному государству');
    }

    const state = await this.statesService.getStateById(settlement.stateId);
    if (state.leaderUsername?.toLowerCase() !== username.toLowerCase()) {
      const user = await this.userRepo.findOne({ where: { username_lower: username.toLowerCase() } });
      if (!user?.isAdmin) {
        throw new ForbiddenException('Только президент государства может назначать столицу');
      }
    }

    await this.settlementRepo.update({ stateId: settlement.stateId, status: 'capital' }, { status: 'settlement' });
    settlement.status = 'capital';
    this.territoriesService.invalidateBlueMapCache();
    return this.settlementRepo.save(settlement);
  }

  async addSettlementImage(id: string, imageUrl: string, username: string): Promise<SettlementEntity> {
    const settlement = await this.getSettlementById(id);
    this.checkSettlementPermission(settlement, username);
    if (!settlement.images) settlement.images = [];
    if (!settlement.images.includes(imageUrl)) {
      settlement.images.push(imageUrl);
    }

    this.territoriesService.invalidateBlueMapCache();
    return this.settlementRepo.save(settlement);
  }

  async removeSettlementImage(id: string, imageUrl: string, username: string): Promise<SettlementEntity> {
    const settlement = await this.getSettlementById(id);
    this.checkSettlementPermission(settlement, username);
    if (settlement.images) {
      settlement.images = settlement.images.filter((img) => img !== imageUrl);
    }

    this.territoriesService.invalidateBlueMapCache();
    return this.settlementRepo.save(settlement);
  }

  private async checkSettlementPermission(settlement: SettlementEntity, username: string) {
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    const isMayor = settlement.mayorUsername && settlement.mayorUsername.toLowerCase() === username.toLowerCase();
    const isPresident =
      settlement.state?.leaderUsername && settlement.state.leaderUsername.toLowerCase() === username.toLowerCase();
    if (!isMayor && !isPresident && !user?.isAdmin) {
      throw new ForbiddenException('Только мэр, президент или администратор могут управлять поселением');
    }
  }

  async getRequestsForSettlement(settlementId: string): Promise<CitizenshipRequestEntity[]> {
    return this.requestRepo.find({
      where: { settlementId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCitizenshipRequest(
    username: string,
    dto: CreateCitizenshipRequestDto,
  ): Promise<CitizenshipRequestEntity> {
    const settlement = await this.getSettlementById(dto.settlementId);
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (user?.settlementId === settlement.id) {
      throw new BadRequestException('Вы уже являетесь жителем этого поселения');
    }

    if (user?.settlementId) {
      const currentSettlement = await this.settlementRepo.findOne({
        where: { id: user.settlementId },
      });
      if (currentSettlement?.mayorUsername && currentSettlement.mayorUsername.toLowerCase() === username.toLowerCase()) {
        throw new BadRequestException(
          'Вы являетесь мэром своего поселения и не можете переехать. Сначала сложите полномочия мэра.',
        );
      }

      if (user.stateId && settlement.stateId && user.stateId !== settlement.stateId) {
        throw new BadRequestException(
          'Вы не можете переехать в поселение другого государства. Заявка на переезд возможна только между городами в пределах одного государства.',
        );
      }
    }

    const anyPending = await this.requestRepo.findOne({
      where: { username, status: 'pending' },
    });
    if (anyPending) {
      throw new BadRequestException(
        'У вас уже есть активная заявка на проживание или переезд. Дождитесь её рассмотрения или отмените.',
      );
    }

    const req = this.requestRepo.create({
      username,
      settlementId: settlement.id,
      status: 'pending',
    });
    return this.requestRepo.save(req);
  }

  async reviewCitizenshipRequest(
    requestId: string,
    dto: ReviewCitizenshipRequestDto,
    reviewerUsername: string,
  ): Promise<CitizenshipRequestEntity> {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Заявка не найдена');
    }

    const settlement = await this.getSettlementById(req.settlementId);
    const reviewerUser = await this.userRepo.findOne({
      where: { username_lower: reviewerUsername.toLowerCase() },
    });
    const isAdmin = reviewerUser?.isAdmin || reviewerUser?.role === 'admin';
    const isMayor = settlement.mayorUsername?.toLowerCase() === reviewerUsername.toLowerCase();
    const isPresident = settlement.state?.leaderUsername?.toLowerCase() === reviewerUsername.toLowerCase();
    if (!isAdmin && !isMayor && !isPresident) {
      throw new ForbiddenException('У вас нет прав на рассмотрение этой заявки');
    }

    req.status = dto.status;
    const saved = await this.requestRepo.save(req);
    if (dto.status === 'approved') {
      const user = await this.userRepo.findOne({ where: { username_lower: req.username.toLowerCase() } });
      const settlement = await this.settlementRepo.findOne({ where: { id: req.settlementId } });
      if (user && settlement) {
        user.settlementId = settlement.id;
        user.stateId = settlement.stateId;
        await this.userRepo.save(user);

        this.eventEmitter.emit('settlement.joined', { initiatorUsername: user.username_lower });
        this.eventEmitter.emit('state.citizens.updated', { stateId: settlement.stateId });

        const otherRequests = await this.requestRepo.find({
          where: { username: req.username, status: 'pending' },
        });
        for (const other of otherRequests) {
          if (other.id !== req.id) {
            other.status = 'rejected';
            await this.requestRepo.save(other);
          }
        }
      }
    }

    return saved;
  }

  async leaveSettlement(settlementId: string, username?: string): Promise<{ success: boolean; message: string }> {
    if (!username) {
      throw new UnauthorizedException('Необходима авторизация');
    }

    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (!user || user.settlementId !== settlementId) {
      throw new BadRequestException('Вы не являетесь жителем этого поселения');
    }

    const settlement = await this.getSettlementById(settlementId);
    if (settlement.mayorUsername && settlement.mayorUsername.toLowerCase() === username.toLowerCase()) {
      await this.resignMayor(settlementId, username);
    }

    const stateId = settlement.stateId;
    user.settlementId = null;
    user.stateId = null;
    await this.userRepo.save(user);
    this.eventEmitter.emit('state.citizens.updated', { stateId });
    return { success: true, message: 'Вы успешно покинули поселение' };
  }

  async resignMayor(settlementId: string, username: string): Promise<{ success: boolean; message: string }> {
    const settlement = await this.getSettlementById(settlementId);
    if (!settlement.mayorUsername || settlement.mayorUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь мэром этого поселения');
    }

    settlement.mayorUsername = '';
    await this.settlementRepo.save(settlement);
    this.territoriesService.invalidateBlueMapCache();
    await this.eventsService.createEvent({
      title: 'Отставка Мэра',
      description: `Игрок ${username} сложил полномочия мэра поселения ${settlement.name}. Объявлены новые выборы!`,
      settlementId: settlement.id,
      type: 'resignation',
    });
    await this.electionsService.createElection({
      targetType: 'settlement',
      targetId: settlement.id,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return { success: true, message: 'Вы успешно сложили полномочия мэра и запустили новые выборы' };
  }

  // --- Settlement Types ---
  async getSettlementTypes(includeUnapproved = false): Promise<SettlementTypeEntity[]> {
    if (includeUnapproved) {
      return this.subtypeRepo.find({ order: { name: 'ASC' } });
    }
    return this.subtypeRepo.find({ where: { isApproved: true }, order: { name: 'ASC' } });
  }

  async proposeSettlementType(name: string, username: string): Promise<SettlementTypeEntity> {
    const existing = await this.subtypeRepo.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException('Такой тип поселения уже существует или предложен');
    }
    const subtype = this.subtypeRepo.create({
      name,
      proposedByUsername: username,
      isApproved: false,
    });
    return this.subtypeRepo.save(subtype);
  }

  async moderateSettlementType(id: string, isApproved: boolean, moderatorUsername: string): Promise<SettlementTypeEntity> {
    const user = await this.userRepo.findOne({ where: { username_lower: moderatorUsername } });
    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Только модераторы могут одобрять типы поселений');
    }

    const subtype = await this.subtypeRepo.findOne({ where: { id } });
    if (!subtype) throw new NotFoundException('Тип поселения не найден');
    subtype.isApproved = isApproved;
    // We could track moderator here if needed
    return this.subtypeRepo.save(subtype);
  }
}

