import { IsString } from 'class-validator';

export class WebhookVerifyQueryDto {
  @IsString()
  'hub.mode': string;

  @IsString()
  'hub.verify_token': string;

  @IsString()
  'hub.challenge': string;
}
