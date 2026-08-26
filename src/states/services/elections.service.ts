import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ElectionEntity } from '../entities/election.entity';
import { ElectionCandidateEntity } from '../entities/election-candidate.entity';
import { ElectionVoteEntity } from '../entities/election-vote.entity';
import { CityEntity } from '../entities/city.entity';
import { StateEntity } from '../entities/state.entity';
import { User } from '../../users/entities/user.entity';
import { EventsService } from '../../events/events.service';
import { AutoNewsService } from '../../news/auto-news.service';
import { CreateElectionDto, NominateCandidateDto, VoteDto } from '../dto/states.dto';
import { StatesService } from '../states.service';
import { CitiesService } from './cities.service';
import { TerritoriesService } from './territories.service';
import { Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ElectionsService {
  constructor(
    @InjectRepository(ElectionEntity)
    private readonly electionRepo: Repository<ElectionEntity>,
    @InjectRepository(ElectionCandidateEntity)
    private readonly candidateRepo: Repository<ElectionCandidateEntity>,
    @InjectRepository(ElectionVoteEntity)
    private readonly voteRepo: Repository<ElectionVoteEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(StateEntity)
    private readonly stateRepo: Repository<StateEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventsService: EventsService,
    private readonly autoNewsService: AutoNewsService,
    @Inject(forwardRef(() => StatesService)) private readonly statesService: StatesService,
    @Inject(forwardRef(() => CitiesService)) private readonly citiesService: CitiesService,
    @Inject(forwardRef(() => TerritoriesService)) private readonly territoriesService: TerritoriesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createElection(dto: CreateElectionDto): Promise<ElectionEntity> {
    const el = this.electionRepo.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      status: 'nomination',
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
    });
    const saved = await this.electionRepo.save(el);
    const targetName = dto.targetType === 'state' ? 'государстве' : 'городе';
    await this.eventsService.createEvent({
      title: `Выборы в ${targetName}`,
      description: `Начался этап регистрации кандидатов. Выборы завершатся ${new Date(dto.endsAt).toLocaleDateString('ru-RU')}.`,
      type: 'election',
      stateId: dto.targetType === 'state' ? dto.targetId : undefined,
      cityId: dto.targetType === 'city' ? dto.targetId : undefined,
    });
    return saved;
  }

  async getElectionById(id: string): Promise<ElectionEntity> {
    const el = await this.electionRepo.findOne({
      where: { id },
      relations: ['candidates'],
    });
    if (!el) {
      throw new NotFoundException('Выборы не найдены');
    }

    return el;
  }

  async nominateCandidate(
    electionId: string,
    username: string,
    dto: NominateCandidateDto,
  ): Promise<ElectionCandidateEntity> {
    const el = await this.getElectionById(electionId);
    const existing = await this.candidateRepo.findOne({
      where: { electionId, username },
    });
    if (existing) {
      throw new BadRequestException('Вы уже выдвинули свою кандидатуру на эти выборы');
    }

    const candidate = await this.userRepo.findOne({ where: { username_lower: username.toLowerCase() } });
    if (!candidate) {
      throw new NotFoundException('Игрок не найден');
    }

    if (el.targetType === 'state') {
      if (!candidate.cityId) {
        throw new ForbiddenException('Вы не состоите ни в одном городе этого государства');
      }
      const candidateCity = await this.cityRepo.findOne({ where: { id: candidate.cityId } });
      if (!candidateCity || candidateCity.stateId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь гражданином этого государства');
      }
    } else if (el.targetType === 'city') {
      if (candidate.cityId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь жителем этого города');
      }
    }

    const cand = this.candidateRepo.create({
      electionId,
      username,
      programText: dto.programText || '',
      votesCount: 0,
    });
    return this.candidateRepo.save(cand);
  }

  async getAllElections(targetType?: string, targetId?: string): Promise<ElectionEntity[]> {
    const where: any = {};
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    return this.electionRepo.find({
      where,
      relations: ['candidates'],
      order: { createdAt: 'DESC' },
    });
  }

  async voteInElection(electionId: string, voterUsername: string, dto: VoteDto): Promise<{ message: string }> {
    const el = await this.getElectionById(electionId);
    if (el.status !== 'voting' && new Date() < el.startsAt) {
      throw new BadRequestException('Голосование на этих выборах сейчас закрыто');
    }

    const existingVote = await this.voteRepo.findOne({
      where: { electionId, voterUsername },
    });
    if (existingVote) {
      throw new BadRequestException('Вы уже проголосовали на этих выборах');
    }

    const cand = await this.candidateRepo.findOne({
      where: { id: dto.candidateId, electionId },
    });
    if (!cand) {
      throw new NotFoundException('Кандидат не найден');
    }

    const voter = await this.userRepo.findOne({ where: { username_lower: voterUsername.toLowerCase() } });
    if (!voter) {
      throw new NotFoundException('Игрок не найден');
    }

    if (el.targetType === 'state') {
      if (!voter.cityId) {
        throw new ForbiddenException('Вы не состоите ни в одном городе этого государства');
      }
      const voterCity = await this.cityRepo.findOne({ where: { id: voter.cityId } });
      if (!voterCity || voterCity.stateId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь гражданином этого государства');
      }
    } else if (el.targetType === 'city') {
      if (voter.cityId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь жителем этого города');
      }
    }

    const vote = this.voteRepo.create({
      electionId,
      voterUsername,
      candidateId: dto.candidateId,
    });
    await this.voteRepo.save(vote);
    cand.votesCount = (cand.votesCount || 0) + 1;
    await this.candidateRepo.save(cand);
    if (el.targetType === 'state') {
      this.eventEmitter.emit('election.president.voted', { initiatorUsername: voterUsername.toLowerCase() });
    } else if (el.targetType === 'city') {
      this.eventEmitter.emit('election.mayor.voted', { initiatorUsername: voterUsername.toLowerCase() });
    }

    return { message: 'Ваш голос учтен!' };
  }

  async concludeElection(electionId: string): Promise<{ message: string; winner?: string }> {
    const el = await this.electionRepo.findOne({
      where: { id: electionId },
      relations: ['candidates'],
    });
    if (!el) {
      throw new NotFoundException('Выборы не найдены');
    }

    if (el.status === 'completed') {
      throw new BadRequestException('Выборы уже завершены');
    }

    let winnerUsername = '';
    let maxVotes = -1;
    if (el.candidates && el.candidates.length > 0) {
      for (const cand of el.candidates) {
        if ((cand.votesCount || 0) > maxVotes) {
          maxVotes = cand.votesCount || 0;
          winnerUsername = cand.username;
        }
      }
    }

    el.status = 'completed';
    await this.electionRepo.save(el);
    if (winnerUsername) {
      if (el.targetType === 'city') {
        const city = await this.citiesService.getCityById(el.targetId);
        city.mayorUsername = winnerUsername;
        await this.cityRepo.save(city);
        this.territoriesService.invalidateBlueMapCache();

        await this.eventsService.createEvent({
          title: 'Итоги выборов Мэра',
          description: `Победителем выборов в городе ${city.name} стал ${winnerUsername} с результатом ${maxVotes} голосов.`,
          cityId: city.id,
          type: 'election',
        });

        this.eventEmitter.emit('election.mayor.won', { initiatorUsername: winnerUsername });
      } else if (el.targetType === 'state') {
        const state = await this.statesService.getStateById(el.targetId);
        state.leaderUsername = winnerUsername;
        await this.stateRepo.save(state);

        await this.eventsService.createEvent({
          title: 'Итоги выборов Президента',
          description: `Президентом государства ${state.name} избран ${winnerUsername} (голосов: ${maxVotes}).`,
          stateId: state.id,
          type: 'election',
        });

        this.eventEmitter.emit('election.president.won', { initiatorUsername: winnerUsername });
      }
    } else {
      // No candidates or votes
      if (el.targetType === 'city') {
        await this.eventsService.createEvent({
          title: 'Выборы Мэра несостоялись',
          description: 'На выборах не оказалось ни одного кандидата с голосами.',
          cityId: el.targetId,
          type: 'election',
        });
      } else {
        await this.eventsService.createEvent({
          title: 'Выборы Президента несостоялись',
          description: 'На выборах не оказалось ни одного кандидата с голосами.',
          stateId: el.targetId,
          type: 'election',
        });
      }
    }

    return { message: 'Выборы успешно завершены', winner: winnerUsername };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleElectionPhases() {
    const now = new Date();
    const toVotingElections = await this.electionRepo
      .createQueryBuilder('election')
      .where('election.status = :status', { status: 'nomination' })
      .andWhere('election.startsAt <= :now', { now })
      .getMany();
    for (const el of toVotingElections) {
      el.status = 'voting';
      await this.electionRepo.save(el);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEndedElections() {
    const now = new Date();
    const endedElections = await this.electionRepo
      .createQueryBuilder('election')
      .where('election.status != :status', { status: 'completed' })
      .andWhere('election.endsAt <= :now', { now })
      .getMany();
    for (const el of endedElections) {
      try {
        await this.concludeElection(el.id);
      } catch (err) {
        console.error(`Ошибка при завершении выборов ${el.id}:`, err);
      }
    }
  }
}
