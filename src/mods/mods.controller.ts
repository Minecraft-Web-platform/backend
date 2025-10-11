import { BadRequestException, Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ModsService } from './mods.service';
import { Response } from 'express';
import archiver, { Archiver } from 'archiver';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { Readable } from 'stream';

@Controller('mods')
export class ModsController {
  constructor(private readonly modsService: ModsService) {}

  @UseGuards(AccessTokenGuard)
  @Get()
  async getOptionalMods() {
    return this.modsService.getOptional();
  }

  @UseGuards(AccessTokenGuard)
  @Post('modpack')
  async buildModpack(@Body() body: { optional: string[] }, @Res() res: Response) {
    const optional = Array.isArray(body?.optional) ? body.optional : [];

    if (optional.some((f) => typeof f !== 'string' || !f.endsWith('.jar'))) {
      throw new BadRequestException('Invalid optional mods list');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=modpack.zip');
    res.setHeader('X-Accel-Buffering', 'no');

    const zipArchive: Archiver = archiver('zip', { zlib: { level: 9 } });
    const activeStreams = new Set<Readable>();

    const destroyActiveStreams = () => {
      for (const s of activeStreams) {
        try {
          s.destroy();
        } catch {
          console.log('Failed to destroy stream');
        }
      }
      activeStreams.clear();
    };

    const abortThisRequest = (reason?: unknown) => {
      try {
        zipArchive.abort();
      } catch {
        console.error(reason);
      }
      destroyActiveStreams();
      try {
        if (!res.writableEnded) res.end();
      } catch {
        console.error(reason);
      }
    };

    zipArchive.on('warning', (err) => {
      console.warn('[archiver:warning]', err);
    });

    zipArchive.on('error', (err) => {
      console.error('[archiver:error]', err);
      abortThisRequest(err);
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        console.warn('[download] Client disconnected — aborting this archive');
        abortThisRequest(new Error('client_disconnected'));
      }
    });

    zipArchive.pipe(res);

    const appendStreamSafe = (stream: Readable, name: string) => {
      activeStreams.add(stream);

      stream.once('error', (err) => {
        console.error('[r2-stream:error]', name, err);
        abortThisRequest(err);
      });

      stream.once('end', () => {
        activeStreams.delete(stream);
      });

      zipArchive.append(stream, { name });
    };

    try {
      const requiredMods = await this.modsService.getAll();

      for (const mod of requiredMods.required) {
        const stream = await this.modsService.getModStream(`required/${mod.file}`);
        appendStreamSafe(stream, `mods/${mod.file}`);
      }

      for (const file of optional) {
        const stream = await this.modsService.getModStream(`optional/${file}`);
        appendStreamSafe(stream, `mods/${file}`);
      }

      const manifest = {
        minecraft: '1.20.1',
        loader: 'fabric',
        date: this.getFormattedDate(),
        required: requiredMods.required.map((m) => m.file),
        optional,
      };
      zipArchive.append(JSON.stringify(manifest, null, 2), {
        name: 'manifest.json',
      });

      await zipArchive.finalize();
      destroyActiveStreams();
    } catch (err) {
      console.error('[modpack:build:error]', err);
      try {
        if (!res.headersSent) {
          res.status(500).send('Failed to build modpack');
        } else {
          abortThisRequest(err);
        }
      } catch {
        console.error('Failed to build modpack');
      }
    }
  }

  private getFormattedDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }
}
