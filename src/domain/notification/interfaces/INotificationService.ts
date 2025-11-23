export abstract class INotificationService {
  abstract notifyMessagePublished(
    queueName: string,
    messageId: string,
  ): Promise<void>;
}
