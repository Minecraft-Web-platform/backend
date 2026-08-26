import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Sse, MessageEvent, Req } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto, UpdateAchievementDto, GrantAchievementDto } from './dto/achievements.dto';
import { AdminGuard } from '../auth/guards/is-admin.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, filter } from 'rxjs';
import { AuthenticatedRequest } from '../auth/types/auth-request.type';

@Controller('achievements')
export class AchievementsController {
  constructor(
    private readonly achievementsService: AchievementsService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Get()
  async getAllAchievements() {
    return this.achievementsService.getAllAchievements();
  }

  @Get('user/:username')
  async getAchievementsByUsername(@Param('username') username: string) {
    return this.achievementsService.getAchievementsByUsername(username.toLowerCase());
  }

  @Post()
  @UseGuards(AccessTokenGuard, AdminGuard)
  async createAchievement(@Body() dto: CreateAchievementDto) {
    return this.achievementsService.createAchievement(dto);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async updateAchievement(@Param('id') id: string, @Body() dto: UpdateAchievementDto) {
    return this.achievementsService.updateAchievement(id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async deleteAchievement(@Param('id') id: string) {
    return this.achievementsService.deleteAchievement(id);
  }

  @Post('grant')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async grantAchievement(@Body() dto: GrantAchievementDto) {
    return this.achievementsService.grantAchievement(dto);
  }

  @Post('revoke')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async revokeAchievement(@Body() dto: GrantAchievementDto) {
    return this.achievementsService.revokeAchievement(dto);
  }

  @Sse('stream')
  @UseGuards(AccessTokenGuard)
  streamAchievements(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const username = req.user.username_lower;

    console.log(`SSE connection opened for user: ${username}`);
    return fromEvent(this.eventEmitter, 'achievement.granted').pipe(
      filter((payload: any) => {
        const matches = payload.username_lower === username;
        console.log(
          `SSE event intercepted. Payload user: ${payload.username_lower}, Target user: ${username}, Matches: ${matches}`,
        );
        return matches;
      }),
      map((payload: any) => {
        console.log(`SSE event mapped and sending for user: ${username}`);
        return {
          data: {
            achievement: payload.achievement,
          },
        } as MessageEvent;
      }),
    );
  }
}
