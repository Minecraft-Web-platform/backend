import { Injectable } from '@nestjs/common';
import { Rcon } from 'rcon-client';

@Injectable()
export class MinecraftRconService {
  private readonly host = '5.83.140.252';
  private readonly port = 25984;
  private readonly password = 'amogus228';

  public async getOnlinePlayers() {
    try {
      const rcon = await Rcon.connect({
        host: this.host,
        port: this.port,
        password: this.password,
      });

      const response = await rcon.send('list');

      await rcon.end();

      const regex = /online:\s(.+)$/;
      const match = response.match(regex);

      const players = match ? match[1].split(', ').map((p) => p.trim()) : [];

      return {
        online: true,
        players,
        playersCount: players.length,
      };
    } catch {
      console.log('Не удалось подключиться к RCON');
      return {
        online: false,
        players: [],
        playersCount: 0,
      };
    }
  }
}
