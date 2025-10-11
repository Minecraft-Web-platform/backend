import { Controller, Get } from '@nestjs/common';
import { MinecraftRconService } from './minecraft-rcon.service';

@Controller('server')
export class MinecraftRconController {
  constructor(private readonly mcService: MinecraftRconService) {}

  @Get('players')
  async getPlayers() {
    return this.mcService.getOnlinePlayers();
  }
}
