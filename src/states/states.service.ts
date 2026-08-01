import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateEntity } from './entities/state.entity';
import { CityEntity } from './entities/city.entity';
import { StateDiplomacyEntity } from './entities/state-diplomacy.entity';
import { StateDecreeEntity } from './entities/state-decree.entity';
import { CitizenshipRequestEntity } from './entities/citizenship-request.entity';
import { ElectionEntity } from './entities/election.entity';
import { ElectionCandidateEntity } from './entities/election-candidate.entity';
import { ElectionVoteEntity } from './entities/election-vote.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateCityDto,
  CreateCitizenshipRequestDto,
  CreateDecreeDto,
  CreateElectionDto,
  CreateStateDto,
  NominateCandidateDto,
  ReviewCitizenshipRequestDto,
  SetDiplomacyDto,
  UpdateCityDto,
  UpdateStateDto,
  VoteDto,
} from './dto/states.dto';

@Injectable()
export class StatesService {
  constructor(
    @InjectRepository(StateEntity)
    private readonly stateRepo: Repository<StateEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(StateDiplomacyEntity)
    private readonly diplomacyRepo: Repository<StateDiplomacyEntity>,
    @InjectRepository(StateDecreeEntity)
    private readonly decreeRepo: Repository<StateDecreeEntity>,
    @InjectRepository(CitizenshipRequestEntity)
    private readonly requestRepo: Repository<CitizenshipRequestEntity>,
    @InjectRepository(ElectionEntity)
    private readonly electionRepo: Repository<ElectionEntity>,
    @InjectRepository(ElectionCandidateEntity)
    private readonly candidateRepo: Repository<ElectionCandidateEntity>,
    @InjectRepository(ElectionVoteEntity)
    private readonly voteRepo: Repository<ElectionVoteEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // --- States ---
  async getAllStates(): Promise<StateEntity[]> {
    return this.stateRepo.find({
      relations: ['cities', 'citizens'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStateById(id: string): Promise<StateEntity> {
    const state = await this.stateRepo.findOne({
      where: { id },
      relations: ['cities', 'citizens', 'decrees'],
    });
    if (!state) {
      throw new NotFoundException('Государство не найдено');
    }
    return state;
  }

  async createState(dto: CreateStateDto): Promise<StateEntity> {
    const state = this.stateRepo.create(dto);
    return this.stateRepo.save(state);
  }

  async updateState(id: string, dto: UpdateStateDto): Promise<StateEntity> {
    const state = await this.getStateById(id);
    Object.assign(state, dto);
    return this.stateRepo.save(state);
  }

  async deleteState(id: string): Promise<void> {
    const result = await this.stateRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Государство не найдено');
    }
  }

  // --- Cities ---
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

  async createCity(dto: CreateCityDto): Promise<CityEntity> {
    const city = this.cityRepo.create(dto);
    return this.cityRepo.save(city);
  }

  async updateCity(id: string, dto: UpdateCityDto): Promise<CityEntity> {
    const city = await this.getCityById(id);
    Object.assign(city, dto);
    return this.cityRepo.save(city);
  }

  async deleteCity(id: string): Promise<void> {
    const result = await this.cityRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Город не найден');
    }
  }

  // --- Decrees ---
  async getDecreesForState(stateId: string): Promise<StateDecreeEntity[]> {
    return this.decreeRepo.find({
      where: { stateId },
      order: { createdAt: 'DESC' },
    });
  }

  async createDecree(stateId: string, dto: CreateDecreeDto, authorUsername: string): Promise<StateDecreeEntity> {
    await this.getStateById(stateId);
    const decree = this.decreeRepo.create({
      stateId,
      title: dto.title,
      content: dto.content,
      authorUsername,
    });
    return this.decreeRepo.save(decree);
  }

  // --- Diplomacy ---
  async getDiplomacyForState(stateId: string): Promise<StateDiplomacyEntity[]> {
    return this.diplomacyRepo.find({
      where: [{ stateAId: stateId }, { stateBId: stateId }],
    });
  }

  async setDiplomacy(stateId: string, dto: SetDiplomacyDto): Promise<StateDiplomacyEntity> {
    let dip = await this.diplomacyRepo.findOne({
      where: [
        { stateAId: stateId, stateBId: dto.stateBId },
        { stateAId: dto.stateBId, stateBId: stateId },
      ],
    });
    if (!dip) {
      dip = this.diplomacyRepo.create({
        stateAId: stateId,
        stateBId: dto.stateBId,
        status: dto.status,
      });
    } else {
      dip.status = dto.status;
    }
    return this.diplomacyRepo.save(dip);
  }

  // --- Citizenship Requests ---
  async getRequestsForCity(cityId: string): Promise<CitizenshipRequestEntity[]> {
    return this.requestRepo.find({
      where: { cityId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCitizenshipRequest(username: string, dto: CreateCitizenshipRequestDto): Promise<CitizenshipRequestEntity> {
    const city = await this.getCityById(dto.cityId);
    const existing = await this.requestRepo.findOne({
      where: { username, cityId: dto.cityId, status: 'pending' },
    });
    if (existing) {
      throw new BadRequestException('У вас уже есть активная заявка в этот город');
    }
    const req = this.requestRepo.create({
      username,
      cityId: city.id,
      status: 'pending',
    });
    return this.requestRepo.save(req);
  }

  async reviewCitizenshipRequest(requestId: string, dto: ReviewCitizenshipRequestDto): Promise<CitizenshipRequestEntity> {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Заявка не найдена');
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
      }
    }

    return saved;
  }

  // --- Elections ---
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

  async createElection(dto: CreateElectionDto): Promise<ElectionEntity> {
    const el = this.electionRepo.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      status: 'nomination',
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
    });
    return this.electionRepo.save(el);
  }

  async nominateCandidate(electionId: string, username: string, dto: NominateCandidateDto): Promise<ElectionCandidateEntity> {
    await this.getElectionById(electionId);
    const existing = await this.candidateRepo.findOne({
      where: { electionId, username },
    });
    if (existing) {
      throw new BadRequestException('Вы уже выдвинули свою кандидатуру на эти выборы');
    }
    const cand = this.candidateRepo.create({
      electionId,
      username,
      programText: dto.programText || '',
      votesCount: 0,
    });
    return this.candidateRepo.save(cand);
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

    const vote = this.voteRepo.create({
      electionId,
      voterUsername,
      candidateId: dto.candidateId,
    });
    await this.voteRepo.save(vote);

    cand.votesCount = (cand.votesCount || 0) + 1;
    await this.candidateRepo.save(cand);

    return { message: 'Ваш голос учтен!' };
  }
}
