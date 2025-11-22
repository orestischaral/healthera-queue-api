import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { DomainExceptionFilter } from '../filters/DomainExceptionFilter';

describe.each(['bullmq', 'rabbitmq'])(
  'HealthController with %s (e2e)',
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

    it('GET /health - should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('queue');
      expect(response.body.queue).toHaveProperty('name');
      expect(response.body.queue).toHaveProperty('healthy');
      expect(['ok', 'degraded']).toContain(response.body.status);
      expect([provider]).toContain(response.body.queue.name);
    });
  },
);
