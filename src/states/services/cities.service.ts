import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CityEntity } from '../entities/city.entity';
import { CitizenshipRequestEntity } from '../entities/citizenship-request.entity';
import { User } from '../../users/entities/user.entity';
import { EventsService } from '../../events/events.service';
import { AutoNewsService } from '../../news/auto-news.service';
import {
  CreateCityDto,
  UpdateCityDto,
  CreateCitizenshipRequestDto,
  ReviewCitizenshipRequestDto,
} from '../dto/states.dto';
import { UnauthorizedException } from '@nestjs/common';
import { StatesService } from '../states.service';
import { TerritoriesService } from './territories.service';
import { ElectionsService } from './elections.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(CitizenshipRequestEntity)
    private readonly requestRepo: Repository<CitizenshipRequestEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventsService: EventsService,
    private readonly autoNewsService: AutoNewsService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => StatesService)) private readonly statesService: StatesService,
    @Inject(forwardRef(() => TerritoriesService)) private readonly territoriesService: TerritoriesService,
    @Inject(forwardRef(() => ElectionsService)) private readonly electionsService: ElectionsService,
  ) {}

  async getAllCities(stateId?: string): Promise<CityEntity[]> {
    const where = stateId ? { stateId } : {};
    return this.cityRepo.find({
      where,
      relations: ['state', 'citizens'],
      order: { name: 'ASC' },
    });
  }

  async getCityById(id: string): Promise<CityEntity> {
    const city = await this.cityRepo.findOne({
      where: { id },
      relations: ['state', 'citizens', 'citizenshipRequests'],
    });
    if (!city) {
      throw new NotFoundException('Город не найден');
    }

    return city;
  }

  async createCity(dto: CreateCityDto, creatorUsername?: string): Promise<CityEntity> {
    const existing = await this.cityRepo
      .createQueryBuilder('city')
      .where('LOWER(city.name) = LOWER(:name)', { name: dto.name })
      .getOne();
    if (existing) {
      throw new BadRequestException('Город с таким названием уже существует');
    }

    const mayor = dto.mayorUsername || creatorUsername;
    const city = this.cityRepo.create({
      ...dto,
      mayorUsername: mayor,
    });
    const saved = await this.cityRepo.save(city);
    if (creatorUsername) {
      this.eventEmitter.emit('city.created', {
        initiatorUsername: creatorUsername,
        cityId: saved.id,
      });
      if (saved.stateId) this.eventEmitter.emit('state.city.updated', { stateId: saved.stateId });
    }

    return saved;
  }

  async updateCity(id: string, dto: UpdateCityDto, username?: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();
      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException(
          'Только мэр города, президент государства или администратор могут редактировать город',
        );
      }
    }

    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        city[key] = dto[key];
      }
    });
    const updated = await this.cityRepo.save(city);
    if (updated.stateId) this.eventEmitter.emit('state.city.updated', { stateId: updated.stateId });
    this.territoriesService.invalidateBlueMapCache();
    return updated;
  }

  async deleteCity(id: string, username?: string): Promise<void> {
    const city = await this.getCityById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();

      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException('Только мэр, президент или администратор могут удалить город');
      }
    }

    const stateId = city.stateId;
    const result = await this.cityRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Город не найден');
    }

    if (stateId) this.eventEmitter.emit('state.city.updated', { stateId });
    this.territoriesService.invalidateBlueMapCache();
  }

  async setCityCapital(id: string, username: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    if (!city.stateId) {
      throw new BadRequestException('Город не принадлежит ни одному государству');
    }

    const state = await this.statesService.getStateById(city.stateId);
    if (state.leaderUsername?.toLowerCase() !== username.toLowerCase()) {
      const user = await this.userRepo.findOne({ where: { username_lower: username.toLowerCase() } });
      if (!user?.isAdmin) {
        throw new ForbiddenException('Только президент государства может назначать столицу');
      }
    }

    await this.cityRepo.update({ stateId: city.stateId }, { isCapital: false });
    city.isCapital = true;
    this.territoriesService.invalidateBlueMapCache();
    return this.cityRepo.save(city);
  }

  async addCityImage(id: string, imageUrl: string, username: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    this.checkCityPermission(city, username);
    if (!city.images) city.images = [];
    if (!city.images.includes(imageUrl)) {
      city.images.push(imageUrl);
    }

    this.territoriesService.invalidateBlueMapCache();
    return this.cityRepo.save(city);
  }

  async removeCityImage(id: string, imageUrl: string, username: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    this.checkCityPermission(city, username);
    if (city.images) {
      city.images = city.images.filter((img) => img !== imageUrl);
    }

    this.territoriesService.invalidateBlueMapCache();
    return this.cityRepo.save(city);
  }

  private async checkCityPermission(city: CityEntity, username: string) {
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
    const isPresident =
      city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();
    if (!isMayor && !isPresident && !user?.isAdmin) {
      throw new ForbiddenException('Только мэр, президент или администратор могут управлять городом');
    }
  }

  async getRequestsForCity(cityId: string): Promise<CitizenshipRequestEntity[]> {
    return this.requestRepo.find({
      where: { cityId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCitizenshipRequest(
    username: string,
    dto: CreateCitizenshipRequestDto,
  ): Promise<CitizenshipRequestEntity> {
    const city = await this.getCityById(dto.cityId);
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (user?.cityId === city.id) {
      throw new BadRequestException('Вы уже являетесь жителем этого города');
    }

    if (user?.cityId) {
      const currentCity = await this.cityRepo.findOne({
        where: { id: user.cityId },
      });
      if (currentCity?.mayorUsername && currentCity.mayorUsername.toLowerCase() === username.toLowerCase()) {
        throw new BadRequestException(
          'Вы являетесь мэром своего города и не можете переехать. Сначала сложите полномочия мэра.',
        );
      }

      if (user.stateId && city.stateId && user.stateId !== city.stateId) {
        throw new BadRequestException(
          'Вы не можете переехать в город другого государства. Заявка на переезд возможна только между городами в пределах одного государства.',
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
      cityId: city.id,
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

    const city = await this.getCityById(req.cityId);
    const reviewerUser = await this.userRepo.findOne({
      where: { username_lower: reviewerUsername.toLowerCase() },
    });
    const isAdmin = reviewerUser?.isAdmin || reviewerUser?.role === 'admin';
    const isMayor = city.mayorUsername?.toLowerCase() === reviewerUsername.toLowerCase();
    const isPresident = city.state?.leaderUsername?.toLowerCase() === reviewerUsername.toLowerCase();
    if (!isAdmin && !isMayor && !isPresident) {
      throw new ForbiddenException('У вас нет прав на рассмотрение этой заявки');
    }

    req.status = dto.status;
    const saved = await this.requestRepo.save(req);
    if (dto.status === 'approved') {
      const user = await this.userRepo.findOne({ where: { username_lower: req.username.toLowerCase() } });
      const city = await this.cityRepo.findOne({ where: { id: req.cityId } });
      if (user && city) {
        user.cityId = city.id;
        user.stateId = city.stateId;
        await this.userRepo.save(user);

        this.eventEmitter.emit('city.joined', { initiatorUsername: user.username_lower });
        this.eventEmitter.emit('state.citizens.updated', { stateId: city.stateId });

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

  async leaveCity(cityId: string, username?: string): Promise<{ success: boolean; message: string }> {
    if (!username) {
      throw new UnauthorizedException('Необходима авторизация');
    }

    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (!user || user.cityId !== cityId) {
      throw new BadRequestException('Вы не являетесь жителем этого города');
    }

    const city = await this.getCityById(cityId);
    if (city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase()) {
      await this.resignMayor(cityId, username);
    }

    const stateId = city.stateId;
    user.cityId = null;
    user.stateId = null;
    await this.userRepo.save(user);
    this.eventEmitter.emit('state.citizens.updated', { stateId });
    return { success: true, message: 'Вы успешно покинули город' };
  }

  async resignMayor(cityId: string, username: string): Promise<{ success: boolean; message: string }> {
    const city = await this.getCityById(cityId);
    if (!city.mayorUsername || city.mayorUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь мэром этого города');
    }

    city.mayorUsername = '';
    await this.cityRepo.save(city);
    this.territoriesService.invalidateBlueMapCache();
    await this.eventsService.createEvent({
      title: 'Отставка Мэра',
      description: `Игрок ${username} сложил полномочия мэра города ${city.name}. Объявлены новые выборы!`,
      cityId: city.id,
      type: 'resignation',
    });
    await this.electionsService.createElection({
      targetType: 'city',
      targetId: city.id,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return { success: true, message: 'Вы успешно сложили полномочия мэра и запустили новые выборы' };
  }
}
