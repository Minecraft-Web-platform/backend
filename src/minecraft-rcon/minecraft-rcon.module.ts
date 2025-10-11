import { Module } from '@nestjs/common';
import { MinecraftRconController } from './minecraft-rcon.controller';
import { MinecraftRconService } from './minecraft-rcon.service';

@Module({
  controllers: [MinecraftRconController],
  providers: [MinecraftRconService],
})
export class MinecraftRconModule {}
