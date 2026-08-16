import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { OwnJwtModule } from './own-jwt/own-jwt.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { LaunchersModule } from './launchers/launchers.module';
import { ModsModule } from './mods/mods.module';
import { TicketModule } from './tickets/tickets.module';
import { NewsModule } from './news/news.module';
import { MinecraftRconModule } from './minecraft-rcon/minecraft-rcon.module';
import { StatesModule } from './states/states.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsModule } from './events/events.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EconomyModule } from './economy/economy.module';
import { UploadModule } from './upload/upload.module';
import { AchievementsModule } from './achievements/achievements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
    }),
    UsersModule,
    DatabaseModule,
    OwnJwtModule,
    AuthModule,
    LaunchersModule,
    ModsModule,
    TicketModule,
    NewsModule,
    MinecraftRconModule,
    StatesModule,
    EconomyModule,
    EventsModule,
    UploadModule,
    AchievementsModule,
  ],
})
export class AppModule { }
