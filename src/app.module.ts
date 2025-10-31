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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
  ],
})
export class AppModule {}
