import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

@Controller('launchers')
export class LaunchersController {
  private readonly baseUrl = 'https://pub-9d1316f4f6df427e8eb2a68374b801fd.r2.dev';

  private readonly fileMap: Record<string, { filename: string; sizeMB: number }> = {
    windows: { filename: 'legacy-launcher-windows.exe', sizeMB: 111.2 },
    mac: { filename: 'legacy-launcher-mac.dmg', sizeMB: 98.1 },
    ubuntu: { filename: 'legacy-launcher-ubuntu.deb', sizeMB: 0.1 },
  };

  @UseGuards(AccessTokenGuard)
  @Get('meta')
  async getMeta() {
    return Object.fromEntries(
      Object.entries(this.fileMap).map(([platform, { filename, sizeMB }]) => [
        platform,
        {
          filename,
          sizeMB,
          url: `${this.baseUrl}/launchers/${filename}`,
        },
      ]),
    );
  }
}
