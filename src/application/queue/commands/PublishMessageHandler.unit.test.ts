import { PublishMessageHandler } from './PublishMessageHandler';
import { PublishMessageCommand } from './PublishMessageCommand';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';

describe('PublishMessageHandler', () => {
  let handler: PublishMessageHandler;
  let mockQueueProvider: jest.Mocked<IQueueProvider>;

  beforeEach(() => {
    mockQueueProvider = {
      name: 'mock',
      connect: jest.fn(),
      disconnect: jest.fn(),
      publish: jest.fn(),
      receive: jest.fn(),
      acknowledge: jest.fn(),
      createQueue: jest.fn(),
      deleteQueue: jest.fn(),
      healthCheck: jest.fn(),
    };

    handler = new PublishMessageHandler(mockQueueProvider);
  });

  it('should publish a message and return message id', async () => {
    mockQueueProvider.publish.mockResolvedValue('msg-123');

    const command = new PublishMessageCommand(
      'test-queue',
      { data: 'test' },
      {
        priority: 'high',
      },
    );
    const result = await handler.execute(command);

    expect(result).toBe('msg-123');
    expect(mockQueueProvider.publish).toHaveBeenCalledTimes(1);
    expect(mockQueueProvider.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: 'test-queue',
        payload: { data: 'test' },
        attributes: { priority: 'high' },
      }),
    );
  });
});
