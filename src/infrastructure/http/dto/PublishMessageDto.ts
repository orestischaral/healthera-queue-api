import { IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';

export class PublishMessageDto {
  @IsNotEmpty()
  payload: unknown;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;
}
