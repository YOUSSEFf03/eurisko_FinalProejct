import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  /**
   * Docker HEALTHCHECK, nginx upstream check, and load balancer probe.
   * Must NOT require authentication.
   */
  @Public()
  @Get()
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
