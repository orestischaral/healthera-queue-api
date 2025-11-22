import { ConfigService } from '@nestjs/config';
import { RabbitMqProvider } from './RabbitMqProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

const mockChannel = {
  sendToQueue: jest.fn(),
  get: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  consume: jest.fn(),
  cancel: jest.fn(),
  assertQueue: jest.fn(),
  deleteQueue: jest.fn(),
  close: jest.fn(),
};

const mockConnection = {
  createChannel: jest.fn(() => Promise.resolve(mockChannel)),
  close: jest.fn(),
};

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

import { connect } from 'amqplib';

describe('RabbitMqProvider', () => {
  let provider: RabbitMqProvider;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();

    (connect as jest.Mock).mockResolvedValue(mockConnection);

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'rabbitmq.url': 'amqp://localhost:5672',
          'rabbitmq.retryAttempts': 3,
          'rabbitmq.retryDelayMs': 100,
        };
        return config[key];
      }),
    } as any;

    provider = new RabbitMqProvider(mockConfigService);
  });

  describe('connect', () => {
    it('should establish connection and create channel', async () => {
      await provider.connect();

      expect(connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    it('should retry on connection failure', async () => {
      (connect as jest.Mock)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockConnection);

      await provider.connect();

      expect(connect).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retry attempts', async () => {
      (connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      await expect(provider.connect()).rejects.toThrow(
        'Failed to connect to RabbitMQ after 3 attempts',
      );
    });
  });

  describe('publish', () => {
    it('should send message to queue', async () => {
      const message = QueueMessage.create(
        'test-queue',
        { data: 'test' },
        { priority: 'high' },
      );

      const result = await provider.publish(message);

      expect(result).toBe(message.id);
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Buffer),
        { messageId: message.id, persistent: true },
      );
    });
  });

  describe('receive', () => {
    it('should return messages from queue', async () => {
      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({ payload: 'test-data', attributes: { key: 'val' } }),
        ),
        properties: { messageId: 'msg-1' },
        fields: { deliveryTag: 123 },
      };
      mockChannel.get
        .mockResolvedValueOnce(mockMsg)
        .mockResolvedValueOnce(null);

      const result = await provider.receive('test-queue', 10);

      expect(result).toHaveLength(1);
      expect(result[0].payload).toBe('test-data');
      expect(result[0].attributes).toEqual({ key: 'val' });
      expect(result[0].receiptHandle).toBe('123');
    });

    it('should return empty array when queue is empty', async () => {
      mockChannel.get.mockResolvedValue(null);

      const result = await provider.receive('test-queue');

      expect(result).toHaveLength(0);
    });
  });

  describe('acknowledge', () => {
    it('should ack message with delivery tag', async () => {
      await provider.acknowledge('test-queue', '123');

      expect(mockChannel.ack).toHaveBeenCalledWith(
        expect.objectContaining({ fields: { deliveryTag: 123 } }),
      );
    });
  });

  describe('createQueue', () => {
    it('should assert queue with durable option', async () => {
      const result = await provider.createQueue('new-queue');

      expect(result).toBe('new-queue');
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('new-queue', {
        durable: true,
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when connected', async () => {
      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      (connect as jest.Mock).mockRejectedValue(new Error('Failed'));
      const freshProvider = new RabbitMqProvider(mockConfigService);

      const result = await freshProvider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('subscribeToQueue', () => {
    it('should set up consumer callback', async () => {
      const handler = jest.fn();
      mockChannel.consume.mockResolvedValue('consumer-tag-123');

      await provider.subscribeToQueue('test-queue', handler);

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        { noAck: false },
      );
    });

    it('should throw if already subscribed to queue', async () => {
      const handler = jest.fn();
      mockChannel.consume.mockResolvedValue('consumer-tag-123');

      await provider.subscribeToQueue('test-queue', handler);

      await expect(
        provider.subscribeToQueue('test-queue', handler),
      ).rejects.toThrow('Consumer already subscribed to queue: test-queue');
    });

    it('should call handler when message arrives', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      mockChannel.consume.mockResolvedValue('consumer-tag-123');

      await provider.subscribeToQueue('test-queue', handler);

      const callback = mockChannel.consume.mock.calls[0][1];
      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({ payload: 'test-data', attributes: { key: 'val' } }),
        ),
        properties: { messageId: 'msg-1' },
        fields: { deliveryTag: 123 },
      };

      await callback(mockMsg);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: 'test-data',
          attributes: { key: 'val' },
        }),
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    });

    it('should nack message on handler error', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      mockChannel.consume.mockResolvedValue('consumer-tag-123');

      await provider.subscribeToQueue('test-queue', handler);

      const callback = mockChannel.consume.mock.calls[0][1];
      const mockMsg = {
        content: Buffer.from(JSON.stringify({ payload: 'test' })),
        properties: { messageId: 'msg-1' },
        fields: { deliveryTag: 123 },
      };

      await callback(mockMsg);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, true);
    });
  });

  describe('unsubscribeFromQueue', () => {
    it('should cancel consumer', async () => {
      const handler = jest.fn();

      await provider.subscribeToQueue('test-queue', handler);
      await provider.unsubscribeFromQueue('test-queue');

      // Just verify cancel was called once with any string argument
      expect(mockChannel.cancel).toHaveBeenCalledTimes(1);
      expect(mockChannel.cancel.mock.calls[0][0]).toContain(
        'consumer-test-queue-',
      );
    });

    it('should throw if no subscription exists', async () => {
      await expect(
        provider.unsubscribeFromQueue('non-existent'),
      ).rejects.toThrow('No consumer subscribed to queue: non-existent');
    });
  });
});
