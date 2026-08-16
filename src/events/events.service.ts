import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity, EventType } from './entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
  ) {}

  async createEvent(data: {
    title: string;
    description: string;
    targetUsername?: string;
    type?: EventType;
    stateId?: string;
    cityId?: string;
  }): Promise<EventEntity> {
    const event = this.eventRepo.create(data);
    return this.eventRepo.save(event);
  }

  async getUserEvents(username: string): Promise<EventEntity[]> {
    // Find events specifically targeted to this user OR global events (targetUsername is null and stateId/cityId is null).
    // For a more advanced version, we could fetch events for the user's city/state too.
    const events = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.targetUsername = :username', { username: username.toLowerCase() })
      .orWhere('event.targetUsername IS NULL')
      .orWhere('event.targetUsername = :empty', { empty: '' })
      .orderBy('event.createdAt', 'DESC')
      .getMany();

    return events;
  }

  async getAllEvents(): Promise<EventEntity[]> {
    return this.eventRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
