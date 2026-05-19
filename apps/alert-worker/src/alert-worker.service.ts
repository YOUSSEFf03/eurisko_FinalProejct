import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertWorkerService {
  getHello(): string {
    return 'Hello World!';
  }
}
