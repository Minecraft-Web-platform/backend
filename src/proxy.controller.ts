import { Controller, Get, Req } from '@nestjs/common';

@Controller('proxy-test')
export class ProxyTestController {
  @Get('*')
  test(@Req() req) {
    console.log('PROXY TEST HIT:', req.url);
    return { url: req.url };
  }
}
