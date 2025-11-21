import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@infrastructure/config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
