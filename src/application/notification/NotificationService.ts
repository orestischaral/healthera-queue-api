import { Injectable } from '@nestjs/common';
import { INotificationService } from '@domain/notification/interfaces/INotificationService';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

@Injectable()
export class NotificationService extends INotificationService {
  constructor(private readonly queueProvider: IQueueProvider) {
    super();
  }

  async notifyMessagePublished(
    queueName: string,
    messageId: string,
  ): Promise<void> {
    const notification = QueueMessage.create('notifications', {
      type: 'message_published',
      queue: queueName,
      messageId: messageId,
      timestamp: new Date(),
    });

    await this.queueProvider.publish(notification);
  }
}
