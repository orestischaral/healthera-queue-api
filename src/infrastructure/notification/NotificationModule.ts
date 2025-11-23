import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { QueueModule } from '@infrastructure/queue/QueueModule';
import { INotificationService } from '@domain/notification/interfaces/INotificationService';
import { NotificationService } from '@application/notification/NotificationService';
import { ProcessNotificationHandler } from '@application/notification/commands/ProcessNotificationHandler';
import { NotificationSubscriber } from './NotificationSubscriber';

@Module({
  imports: [CqrsModule, QueueModule.forRootAsync()],
  providers: [
    NotificationService,
    ProcessNotificationHandler,
    NotificationSubscriber,
    {
      provide: INotificationService,
      useClass: NotificationService,
    },
  ],
  exports: [NotificationService, INotificationService],
})
export class NotificationModule {}
