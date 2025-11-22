import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { DomainExceptionFilter } from '../filters/DomainExceptionFilter';

describe.each(['bullmq', 'rabbitmq'])(
  'QueueController with %s (e2e)',
  (provider) => {
    let app: INestApplication;

    beforeAll(async () => {
      process.env.QUEUE_PROVIDER = provider;
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      app.useGlobalFilters(new DomainExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    const queueName = `test-queue-${Math.floor(Math.random())}`;

    it('POST /queues - should create a queue', async () => {
      const response = await request(app.getHttpServer())
        .post('/queues')
        .send({ name: queueName })
        .expect(201);

      expect(response.body).toEqual({ queue: queueName });
    });

    it('DELETE /queues/:name - should delete a queue', async () => {
      await request(app.getHttpServer())
        .delete(`/queues/${queueName}`)
        .expect(200);
    });

    it('POST /queues with invalid name - should return 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/queues')
        .send({ name: 'invalid/queue/name' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  },
);
