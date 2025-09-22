import { Controller, Get } from '@nestjs/common';
import { promises as fs } from 'fs';
import { resolve, join } from 'path';

@Controller('launchers')
export class LaunchersController {
  private readonly basePath = resolve(process.cwd(), 'files/launchers');

  private readonly fileMap: Record<string, { filename: string }> = {
    windows: { filename: 'legacy-launcher-windows.exe' },
    mac: { filename: 'legacy-launcher-mac.dmg' },
    ubuntu: { filename: 'legacy-launcher-ubuntu.deb' },
  };

  @Get('meta')
  async getMeta() {
    const meta: Record<
      string,
      {
        filename: string;
        size: number;
        sizeMB: number;
        url: string;
      }
    > = {};

    for (const [platform, { filename }] of Object.entries(this.fileMap)) {
      const filePath = join(this.basePath, filename);

      try {
        const stat = await fs.stat(filePath);
        const size = stat.size;
        const sizeMB = parseFloat((size / (1024 * 1024)).toFixed(1));

        meta[platform] = {
          filename,
          size,
          sizeMB,
          url: `/launchers/${filename}`,
        };
      } catch (e) {
        console.log('LauncherControllerError: \n', e.message);
      }
    }

    return meta;
  }
}
