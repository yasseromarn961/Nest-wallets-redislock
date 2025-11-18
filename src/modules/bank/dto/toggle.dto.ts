import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleDto {
  @ApiProperty({ description: 'Enable or disable the target', example: true })
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}
