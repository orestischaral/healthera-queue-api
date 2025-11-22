import { ConfigService } from '@nestjs/config';
import { BullMqProvider } from './BullMqProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

jest.mock('bullmq', () => {
  const mockQueue = {
    add: jest.fn(),
    getJobs: jest.fn(),
    getJob: jest.fn(),
    obliterate: jest.fn(),
    close: jest.fn(),
    client: Promise.resolve(),
  };
  const mockWorker = {
    close: jest.fn(),
  };
  return {
    Queue: jest.fn(() => mockQueue),
    Worker: jest.fn(() => mockWorker),
  };
});

import { Queue, Worker } from 'bullmq';

describe('BullMqProvider', () => {
  let provider: BullMqProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockQueue: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'redis.host': 'localhost',
          'redis.port': 6379,
        };
        return config[key];
      }),
    } as any;

    provider = new BullMqProvider(mockConfigService);
    mockQueue = (Queue as unknown as jest.Mock).mock.results[0]?.value;
  });

  describe('publish', () => {
    it('should add job to queue and return message id', async () => {
      const message = QueueMessage.create(
        'test-queue',
        { data: 'test' },
        { priority: 'high' },
      );
      mockQueue = {
        add: jest.fn().mockResolvedValue({ id: message.id }),
        close: jest.fn(),
        client: Promise.resolve(),
      };
      (Queue as unknown as jest.Mock).mockImplementation(() => mockQueue);

      const result = await provider.publish(message);

      expect(result).toBe(message.id);
      expect(mockQueue.add).toHaveBeenCalledWith(
        message.id,
        { payload: message.payload, attributes: message.attributes },
        { jobId: message.id },
      );
    });
  });

  describe('receive', () => {
    it('should return messages from queue', async () => {
      const mockJobs = [
        { id: 'job-1', data: { payload: 'data1', attributes: { key: 'val' } } },
        { id: 'job-2', data: { payload: 'data2', attributes: undefined } },
      ];
      mockQueue = {
        getJobs: jest.fn().mockResolvedValue(mockJobs),
        close: jest.fn(),
        client: Promise.resolve(),
      };
      (Queue as unknown as jest.Mock).mockImplementation(() => mockQueue);

      const result = await provider.receive('test-queue', 10);

      expect(result).toHaveLength(2);
      expect(result[0].payload).toBe('data1');
      expect(result[0].attributes).toEqual({ key: 'val' });
      expect(mockQueue.getJobs).toHaveBeenCalledWith(
        ['waiting', 'delayed'],
        0,
        9,
      );
    });
  });

  describe('acknowledge', () => {
    it('should remove job from queue', async () => {
      const mockJob = { remove: jest.fn() };
      mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
        close: jest.fn(),
        client: Promise.resolve(),
      };
      (Queue as unknown as jest.Mock).mockImplementation(() => mockQueue);

      await provider.acknowledge('test-queue', 'job-123');

      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(mockJob.remove).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when connection succeeds', async () => {
      mockQueue = {
        client: Promise.resolve(),
        close: jest.fn(),
      };
      (Queue as unknown as jest.Mock).mockImplementation(() => mockQueue);

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      (Queue as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('subscribeToQueue', () => {
    it('should create worker and store it', async () => {
      const handler = jest.fn();
      await provider.subscribeToQueue('test-queue', handler);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          connection: { host: 'localhost', port: 6379 },
        }),
      );
    });

    it('should throw if already subscribed to queue', async () => {
      const handler = jest.fn();
      await provider.subscribeToQueue('test-queue', handler);

      await expect(
        provider.subscribeToQueue('test-queue', handler),
      ).rejects.toThrow('Worker already subscribed to queue: test-queue');
    });
  });

  describe('unsubscribeFromQueue', () => {
    it('should close worker and remove from map', async () => {
      const handler = jest.fn();

      await provider.subscribeToQueue('test-queue', handler);
      const mockWorker = (Worker as unknown as jest.Mock).mock.results[0]
        ?.value;
      await provider.unsubscribeFromQueue('test-queue');

      expect(mockWorker.close).toHaveBeenCalled();
    });

    it('should throw if no subscription exists', async () => {
      await expect(
        provider.unsubscribeFromQueue('non-existent'),
      ).rejects.toThrow('No worker subscribed to queue: non-existent');
    });
  });
});
