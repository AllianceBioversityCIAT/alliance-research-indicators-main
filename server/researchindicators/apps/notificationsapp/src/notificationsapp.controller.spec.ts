import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsappController } from './notificationsapp.controller';
import { NotificationsappService } from './notificationsapp.service';

describe('NotificationsappController', () => {
  let notificationsappController: NotificationsappController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsappController],
      providers: [NotificationsappService],
    }).compile();

    notificationsappController = app.get<NotificationsappController>(NotificationsappController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(notificationsappController.getHello()).toBe('Hello World!');
    });
  });
});
