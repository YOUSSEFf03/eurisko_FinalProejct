import { Test, TestingModule } from '@nestjs/testing';
import { AlertWorkerController } from './alert-worker.controller';
import { AlertWorkerService } from './alert-worker.service';

describe('AlertWorkerController', () => {
  let alertWorkerController: AlertWorkerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AlertWorkerController],
      providers: [AlertWorkerService],
    }).compile();

    alertWorkerController = app.get<AlertWorkerController>(AlertWorkerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(alertWorkerController.getHello()).toBe('Hello World!');
    });
  });
});
