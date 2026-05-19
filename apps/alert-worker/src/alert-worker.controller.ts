import { Controller, Get } from '@nestjs/common';
import { AlertWorkerService } from './alert-worker.service';

@Controller()
export class AlertWorkerController {
  constructor(private readonly alertWorkerService: AlertWorkerService) {}

  @Get()
  getHello(): string {
    return this.alertWorkerService.getHello();
  }
}
