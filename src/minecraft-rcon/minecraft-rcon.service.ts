import { Injectable } from '@nestjs/common';
import { Rcon } from 'rcon-client';

@Injectable()
export class MinecraftRconService {
  private readonly host = process.env.RCON_HOST || '5.83.140.252';
  private readonly port = parseInt(process.env.RCON_PORT || '25984', 10);
  private readonly password = process.env.RCON_PASSWORD || 'amogus228';

  private cachedOnline: { data: { online: boolean; players: string[]; playersCount: number }; expiresAt: number } | null = null;
  private onlinePromise: Promise<{ online: boolean; players: string[]; playersCount: number }> | null = null;

  private cachedPing: { data: { running: boolean }; expiresAt: number } | null = null;
  private pingPromise: Promise<{ running: boolean }> | null = null;

  private readonly CACHE_TTL_MS = 4000;

  public async getOnlinePlayers(): Promise<{ online: boolean; players: string[]; playersCount: number }> {
    if (this.cachedOnline && Date.now() < this.cachedOnline.expiresAt) {
      return this.cachedOnline.data;
    }

    if (this.onlinePromise) {
      return this.onlinePromise;
    }

    this.onlinePromise = (async () => {
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
        const playersMatch = response.match(/players online:\s*(.*)/i);

        const playersCount = countMatch ? Number(countMatch[1]) : 0;
        const players =
          playersMatch && playersMatch[1].trim().length > 0
            ? playersMatch[1]
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
            : [];

        const result = {
          online: true,
          players,
          playersCount,
        };

        this.cachedOnline = { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS };
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log('Не удалось подключиться к RCON:', message);

        const fallback = {
          online: false,
          players: [],
          playersCount: 0,
        };
        this.cachedOnline = { data: fallback, expiresAt: Date.now() + 2000 };
        return fallback;
      } finally {
        this.onlinePromise = null;
        if (rcon) {
          await rcon.end().catch(() => {});
        }
      }
    })();

    return this.onlinePromise;
  }

  public async ping(): Promise<{ running: boolean }> {
    if (this.cachedPing && Date.now() < this.cachedPing.expiresAt) {
      return this.cachedPing.data;
    }

    if (this.pingPromise) {
      return this.pingPromise;
    }

    this.pingPromise = (async () => {
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

        const result = {
          running: true,
        };

        this.cachedPing = { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS };
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log('RCON ping failed:', message);

        const fallback = {
          running: false,
        };
        this.cachedPing = { data: fallback, expiresAt: Date.now() + 2000 };
        return fallback;
      } finally {
        this.pingPromise = null;
        if (rcon) {
          await rcon.end().catch(() => {});
        }
      }
    })();

    return this.pingPromise;
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
