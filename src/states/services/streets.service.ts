import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreetEntity } from '../entities/street.entity';
import { CityEntity } from '../entities/city.entity';

@Injectable()
export class StreetsService {
  constructor(
    @InjectRepository(StreetEntity)
    private readonly streetRepository: Repository<StreetEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepository: Repository<CityEntity>,
  ) {}

  public async getStreetsByCity(cityId: string): Promise<StreetEntity[]> {
    return this.streetRepository.find({
      where: { cityId },
      order: { createdAt: 'ASC' },
    });
  }

  public async createStreet(username: string, cityId: string, name: string): Promise<StreetEntity> {
    const city = await this.cityRepository.findOne({ where: { id: cityId }, relations: ['state'] });
    if (!city) throw new NotFoundException('Город не найден');

    const isMayor = city.mayorUsername?.toLowerCase() === username.toLowerCase();
    const isPresident = city.state?.leaderUsername?.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident) {
      throw new ForbiddenException('Только мэр или президент могут создавать улицы');
    }

    if (!name || name.trim().length < 2) {
      throw new BadRequestException('Название улицы должно быть длиннее 2 символов');
    }

    const existing = await this.streetRepository.findOne({ where: { cityId, name: name.trim() } });
    if (existing) {
      throw new BadRequestException('Улица с таким названием уже существует в этом городе');
    }

    const street = this.streetRepository.create({
      cityId,
      name: name.trim(),
    });

    return this.streetRepository.save(street);
  }

  public async updateStreet(username: string, cityId: string, streetId: string, name: string): Promise<StreetEntity> {
    const city = await this.cityRepository.findOne({ where: { id: cityId }, relations: ['state'] });
    if (!city) throw new NotFoundException('Город не найден');

    const isMayor = city.mayorUsername?.toLowerCase() === username.toLowerCase();
    const isPresident = city.state?.leaderUsername?.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident) {
      throw new ForbiddenException('Только мэр или президент могут редактировать улицы');
    }

    const street = await this.streetRepository.findOne({ where: { id: streetId, cityId } });
    if (!street) {
      throw new NotFoundException('Улица не найдена');
    }

    if (!name || name.trim().length < 2) {
      throw new BadRequestException('Название улицы должно быть длиннее 2 символов');
    }

    street.name = name.trim();
    return this.streetRepository.save(street);
  }

  public async deleteStreet(username: string, cityId: string, streetId: string): Promise<void> {
    const city = await this.cityRepository.findOne({ where: { id: cityId }, relations: ['state'] });
    if (!city) throw new NotFoundException('Город не найден');

    const isMayor = city.mayorUsername?.toLowerCase() === username.toLowerCase();
    const isPresident = city.state?.leaderUsername?.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident) {
      throw new ForbiddenException('Только мэр или президент могут удалять улицы');
    }

    const street = await this.streetRepository.findOne({ where: { id: streetId, cityId } });
    if (!street) {
      throw new NotFoundException('Улица не найдена');
    }

    await this.streetRepository.remove(street);
  }
}
