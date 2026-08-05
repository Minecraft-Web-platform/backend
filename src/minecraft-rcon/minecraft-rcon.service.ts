import { Injectable } from '@nestjs/common';
import { Rcon } from 'rcon-client';

@Injectable()
export class MinecraftRconService {
  private readonly host = '5.83.140.252';
  private readonly port = 25984;
  private readonly password = 'amogus228';

  public async getOnlinePlayers() {
    let rcon: Rcon | null = null;

    try {
      rcon = await Rcon.connect({
        host: this.host,
        port: this.port,
        password: this.password,
      });

      const response = await Promise.race<string>([
        rcon.send('list'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RCON timeout')), 3000)),
      ]);

      if (typeof response !== 'string') {
        throw new Error('Invalid RCON response');
      }

      const countMatch = response.match(/There are (\d+) of a max of \d+ players online:?/i);
      const playersMatch = response.match(/players online:\s*(.*)$/i);

      const playersCount = countMatch ? Number(countMatch[1]) : 0;

      const players =
        playersMatch && playersMatch[1].trim().length > 0
          ? playersMatch[1]
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [];

      return {
        online: true,
        players,
        playersCount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log('Не удалось подключиться к RCON:', message);

      return {
        online: false,
        players: [],
        playersCount: 0,
      };
    } finally {
      if (rcon) {
        await rcon.end().catch(() => {});
      }
    }
  }

  public async ping() {
    let rcon: Rcon | null = null;

    try {
      rcon = await Rcon.connect({
        host: this.host,
        port: this.port,
        password: this.password,
      });

      const response = await Promise.race<string>([
        rcon.send('list'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RCON timeout')), 3000)),
      ]);

      if (typeof response !== 'string' || !response.toLowerCase().includes('players online')) {
        throw new Error('Invalid RCON response');
      }

      return {
        running: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      console.log('RCON ping failed:', message);

      return {
        running: false,
      };
    } finally {
      if (rcon) {
        await rcon.end().catch(() => {});
      }
    }
  }

  public async executeCommand(command: string): Promise<string> {
    let rcon: Rcon | null = null;
    try {
      rcon = await Rcon.connect({
        host: this.host,
        port: this.port,
        password: this.password,
      });

      const response = await Promise.race<string>([
        rcon.send(command),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RCON timeout')), 5000)),
      ]);

      if (typeof response !== 'string') {
        throw new Error('Invalid RCON response');
      }

      return response;
    } finally {
      if (rcon) {
        await rcon.end().catch(() => {});
      }
    }
  }
}
