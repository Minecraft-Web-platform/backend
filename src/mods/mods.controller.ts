import { BadRequestException, Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ModsService } from './mods.service';
import { Response } from 'express';
import archiver from 'archiver';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

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

    const zipArchive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=modpack.zip');

    res.on('close', () => {
      console.warn('Client disconnected during download');
      zipArchive.abort();
    });

    zipArchive.pipe(res);

    const requiredMods = await this.modsService.getAll();

    for (const mod of requiredMods.required) {
      const stream = await this.modsService.getModStream(`required/${mod.file}`);
      zipArchive.append(stream, { name: `mods/${mod.file}` });
    }

    for (const file of optional) {
      const stream = await this.modsService.getModStream(`optional/${file}`);
      zipArchive.append(stream, { name: `mods/${file}` });
    }

    const manifest = {
      minecraft: '1.20.1',
      loader: 'fabric',
      date: this.getFormattedDate(),
      required: requiredMods.required.map((m) => m.file),
      optional,
    };
    zipArchive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    await zipArchive.finalize();
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
