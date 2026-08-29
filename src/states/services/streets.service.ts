import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreetEntity } from '../entities/street.entity';
import { SettlementEntity } from '../entities/settlement.entity';

@Injectable()
export class StreetsService {
  constructor(
    @InjectRepository(StreetEntity)
    private readonly streetRepository: Repository<StreetEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepository: Repository<SettlementEntity>,
  ) {}

  public async getStreetsBySettlement(settlementId: string): Promise<StreetEntity[]> {
    return this.streetRepository.find({
      where: { settlementId },
      order: { createdAt: 'ASC' },
    });
  }

  public async createStreet(username: string, settlementId: string, name: string): Promise<StreetEntity> {
    const settlement = await this.settlementRepository.findOne({ where: { id: settlementId }, relations: ['state'] });
    if (!settlement) throw new NotFoundException('Поселение не найден');

    const isMayor = settlement.mayorUsername?.toLowerCase() === username.toLowerCase();
    const isPresident = settlement.state?.leaderUsername?.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident) {
      throw new ForbiddenException('Только мэр или президент могут создавать улицы');
    }

    if (!name || name.trim().length < 2) {
      throw new BadRequestException('Название улицы должно быть длиннее 2 символов');
    }

    const existing = await this.streetRepository.findOne({ where: { settlementId, name: name.trim() } });
    if (existing) {
      throw new BadRequestException('Улица с таким названием уже существует в этом поселении');
    }

    const street = this.streetRepository.create({
      settlementId,
      name: name.trim(),
    });

    return this.streetRepository.save(street);
  }

  public async updateStreet(username: string, settlementId: string, streetId: string, name: string): Promise<StreetEntity> {
    const settlement = await this.settlementRepository.findOne({ where: { id: settlementId }, relations: ['state'] });
    if (!settlement) throw new NotFoundException('Поселение не найден');

    const isMayor = settlement.mayorUsername?.toLowerCase() === username.toLowerCase();
    const isPresident = settlement.state?.leaderUsername?.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident) {
      throw new ForbiddenException('Только мэр или президент могут редактировать улицы');
    }

    const street = await this.streetRepository.findOne({ where: { id: streetId, settlementId } });
    if (!street) {
      throw new NotFoundException('Улица не найдена');
    }

    if (!name || name.trim().length < 2) {
      throw new BadRequestException('Название улицы должно быть длиннее 2 символов');
    }

    street.name = name.trim();
    return this.streetRepository.save(street);
  }

  public async deleteStreet(username: string, settlementId: string, streetId: string): Promise<void> {
    const settlement = await this.settlementRepository.findOne({ where: { id: settlementId }, relations: ['state'] });
    if (!settlement) throw new NotFoundException('Поселение не найден');

    const isMayor = settlement.mayorUsername?.toLowerCase() === username.toLowerCase();
    const isPresident = settlement.state?.leaderUsername?.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident) {
      throw new ForbiddenException('Только мэр или президент могут удалять улицы');
    }

    const street = await this.streetRepository.findOne({ where: { id: streetId, settlementId } });
    if (!street) {
      throw new NotFoundException('Улица не найдена');
    }

    await this.streetRepository.remove(street);
  }
}
