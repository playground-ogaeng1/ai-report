import { Controller, Get } from '@nestjs/common';
import { AppService, type HealthResult } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): Promise<HealthResult> {
    return this.appService.getHealth();
  }
}
