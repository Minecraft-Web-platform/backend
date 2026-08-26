import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StatesService } from './states.service';
import { CreateElectionDto, NominateCandidateDto, VoteDto } from './dto/states.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminGuard } from '../auth/guards/is-admin.guard';
import { AuthenticatedRequest } from '../auth/types/auth-request.type';
import { ElectionsService } from './services/elections.service';

@Controller('elections')
export class ElectionsController {
  constructor(
    private readonly statesService: StatesService,
    private readonly electionsService: ElectionsService,
  ) {}

  @Get()
  async getAllElections(@Query('targetType') targetType?: string, @Query('targetId') targetId?: string) {
    return this.electionsService.getAllElections(targetType, targetId);
  }

  @Get(':id')
  async getElectionById(@Param('id') id: string) {
    return this.electionsService.getElectionById(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard, AdminGuard)
  async createElection(@Body() dto: CreateElectionDto) {
    return this.electionsService.createElection(dto);
  }

  @Post(':id/nominate')
  @UseGuards(AccessTokenGuard)
  async nominateCandidate(
    @Param('id') id: string,
    @Body() dto: NominateCandidateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const username = req.user?.username_lower || 'Candidate';
    return this.electionsService.nominateCandidate(id, username, dto);
  }

  @Post(':id/vote')
  @UseGuards(AccessTokenGuard)
  async voteInElection(@Param('id') id: string, @Body() dto: VoteDto, @Req() req: AuthenticatedRequest) {
    const username = req.user?.username_lower || 'Voter';
    return this.electionsService.voteInElection(id, username, dto);
  }
}
