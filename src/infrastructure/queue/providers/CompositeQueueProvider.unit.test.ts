import { QueueMessage } from '@domain/queue/entities/QueueMessage';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { CompositeQueueProvider, QueueRouting } from './CompositeQueueProvider';

describe('CompositeQueueProvider', () => {
  let compositeProvider: CompositeQueueProvider;
  let mockBullMqProvider: jest.Mocked<IQueueProvider>;
  let mockRabbitMqProvider: jest.Mocked<IQueueProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBullMqProvider = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createQueue: jest.fn().mockResolvedValue('queue-id'),
      deleteQueue: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue('msg-id-1'),
      receive: jest.fn().mockResolvedValue([]),
      acknowledge: jest.fn().mockResolvedValue(undefined),
      subscribeToQueue: jest.fn().mockResolvedValue(undefined),
      unsubscribeFromQueue: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<IQueueProvider>;

    mockRabbitMqProvider = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createQueue: jest.fn().mockResolvedValue('queue-id'),
      deleteQueue: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue('msg-id-2'),
      receive: jest.fn().mockResolvedValue([]),
      acknowledge: jest.fn().mockResolvedValue(undefined),
      subscribeToQueue: jest.fn().mockResolvedValue(undefined),
      unsubscribeFromQueue: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<IQueueProvider>;
  });

  describe('Publish', () => {
    it('should route all queues to both providers with "both" routing', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const message = QueueMessage.create('orders', { orderId: 1 });
      await compositeProvider.publish(message);

      expect(mockBullMqProvider.publish).toHaveBeenCalledWith(message);
      expect(mockRabbitMqProvider.publish).toHaveBeenCalledWith(message);
    });

    it('should route specific queue to BullMQ only', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { orders: 'bullmq', '*': 'rabbitmq' },
      );

      const message = QueueMessage.create('orders', { orderId: 1 });
      await compositeProvider.publish(message);

      expect(mockBullMqProvider.publish).toHaveBeenCalledWith(message);
      expect(mockRabbitMqProvider.publish).not.toHaveBeenCalled();
    });

    it('should route specific queue to RabbitMQ only', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { notifications: 'rabbitmq', '*': 'bullmq' },
      );

      const message = QueueMessage.create('notifications', { type: 'alert' });
      await compositeProvider.publish(message);

      expect(mockRabbitMqProvider.publish).toHaveBeenCalledWith(message);
      expect(mockBullMqProvider.publish).not.toHaveBeenCalled();
    });
  });

  describe('Receive', () => {
    it('should receive from primary provider only', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const messages = [QueueMessage.create('orders', { id: 1 })];
      mockBullMqProvider.receive.mockResolvedValue(messages);

      const result = await compositeProvider.receive('orders', 10);

      expect(mockBullMqProvider.receive).toHaveBeenCalledWith('orders', 10);
      expect(mockRabbitMqProvider.receive).not.toHaveBeenCalled();
      expect(result).toEqual(messages);
    });

    it('should receive with correct maxMessages parameter', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'bullmq' },
      );

      await compositeProvider.receive('orders', 5);

      expect(mockBullMqProvider.receive).toHaveBeenCalledWith('orders', 5);
    });
  });

  describe('CreateQueue', () => {
    it('should create queue on both providers when "both" is configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const queueId = await compositeProvider.createQueue('orders');

      expect(mockBullMqProvider.createQueue).toHaveBeenCalledWith('orders');
      expect(mockRabbitMqProvider.createQueue).toHaveBeenCalledWith('orders');
      expect(queueId).toBe('queue-id');
    });

    it('should create queue on single provider when configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { orders: 'bullmq', '*': 'rabbitmq' },
      );

      await compositeProvider.createQueue('orders');

      expect(mockBullMqProvider.createQueue).toHaveBeenCalledWith('orders');
      expect(mockRabbitMqProvider.createQueue).not.toHaveBeenCalled();
    });
  });

  describe('DeleteQueue', () => {
    it('should delete queue from both providers when "both" is configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      await compositeProvider.deleteQueue('orders');

      expect(mockBullMqProvider.deleteQueue).toHaveBeenCalledWith('orders');
      expect(mockRabbitMqProvider.deleteQueue).toHaveBeenCalledWith('orders');
    });
  });

  describe('Acknowledge', () => {
    it('should acknowledge message in both providers when "both" is configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      await compositeProvider.acknowledge('orders', 'receipt-123');

      expect(mockBullMqProvider.acknowledge).toHaveBeenCalledWith(
        'orders',
        'receipt-123',
      );
      expect(mockRabbitMqProvider.acknowledge).toHaveBeenCalledWith(
        'orders',
        'receipt-123',
      );
    });
  });

  describe('Connect/Disconnect', () => {
    it('should connect both providers', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      await compositeProvider.connect();

      expect(mockBullMqProvider.connect).toHaveBeenCalled();
      expect(mockRabbitMqProvider.connect).toHaveBeenCalled();
    });

    it('should disconnect both providers', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      await compositeProvider.disconnect();

      expect(mockBullMqProvider.disconnect).toHaveBeenCalled();
      expect(mockRabbitMqProvider.disconnect).toHaveBeenCalled();
    });

    it('should throw error if connect fails', async () => {
      mockBullMqProvider.connect.mockRejectedValue(
        new Error('Connection failed'),
      );

      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      await expect(compositeProvider.connect()).rejects.toThrow(
        'Connection failed',
      );
    });
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should subscribe to both providers when "both" is configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const handler = jest.fn();

      await compositeProvider.subscribeToQueue('orders', handler);

      expect(mockBullMqProvider.subscribeToQueue).toHaveBeenCalledWith(
        'orders',
        expect.any(Function),
      );
      expect(mockRabbitMqProvider.subscribeToQueue).toHaveBeenCalledWith(
        'orders',
        expect.any(Function),
      );
    });

    it('should subscribe to single provider when configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { orders: 'bullmq', '*': 'rabbitmq' },
      );

      const handler = jest.fn();

      await compositeProvider.subscribeToQueue('orders', handler);

      expect(mockBullMqProvider.subscribeToQueue).toHaveBeenCalled();
      expect(mockRabbitMqProvider.subscribeToQueue).not.toHaveBeenCalled();
    });

    it('should call handler when message arrives from BullMQ', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const handler = jest.fn().mockResolvedValue(undefined);
      const message = QueueMessage.create('orders', { id: 1 });

      let bullmqCallback: any = null;
      mockBullMqProvider.subscribeToQueue.mockImplementation(
        async (queue, cb) => {
          bullmqCallback = cb;
        },
      );

      await compositeProvider.subscribeToQueue('orders', handler);

      if (bullmqCallback) {
        await bullmqCallback(message);
      }

      expect(handler).toHaveBeenCalledWith(message);
    });

    it('should unsubscribe from both providers when "both" is configured', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const handler = jest.fn();
      await compositeProvider.subscribeToQueue('orders', handler);

      await compositeProvider.unsubscribeFromQueue('orders');

      expect(mockBullMqProvider.unsubscribeFromQueue).toHaveBeenCalledWith(
        'orders',
      );
      expect(mockRabbitMqProvider.unsubscribeFromQueue).toHaveBeenCalledWith(
        'orders',
      );
    });
  });

  describe('HealthCheck', () => {
    it('should return true when both providers are healthy', async () => {
      mockBullMqProvider.healthCheck.mockResolvedValue(true);
      mockRabbitMqProvider.healthCheck.mockResolvedValue(true);

      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const isHealthy = await compositeProvider.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockBullMqProvider.healthCheck).toHaveBeenCalled();
      expect(mockRabbitMqProvider.healthCheck).toHaveBeenCalled();
    });

    it('should return false when one provider is unhealthy', async () => {
      mockBullMqProvider.healthCheck.mockResolvedValue(true);
      mockRabbitMqProvider.healthCheck.mockResolvedValue(false);

      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const isHealthy = await compositeProvider.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false when health check fails', async () => {
      mockBullMqProvider.healthCheck.mockRejectedValue(
        new Error('Health check error'),
      );

      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
        { '*': 'both' },
      );

      const isHealthy = await compositeProvider.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Default Routing', () => {
    it('should default to BullMQ when no routing provided', async () => {
      compositeProvider = new CompositeQueueProvider(
        mockBullMqProvider,
        mockRabbitMqProvider,
      );

      const message = QueueMessage.create('orders', {});
      await compositeProvider.publish(message);

      expect(mockBullMqProvider.publish).toHaveBeenCalledWith(message);
      expect(mockRabbitMqProvider.publish).not.toHaveBeenCalled();
    });
  });
});
