import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateQueueDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Queue name can only contain letters, numbers, underscores, and hyphens',
  })
  name: string;
}
