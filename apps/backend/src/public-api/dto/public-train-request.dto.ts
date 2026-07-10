import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

export class PublicTrainScheduleParamsDto {
  @ApiProperty({ example: '001' })
  @IsString()
  @IsNotEmpty()
  trainNo: string;
}

export class PublicTrainScheduleQueryDto {
  @ApiProperty({
    description: 'Korean service date',
    example: '2026-07-10',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsString()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'serviceDate must be in YYYY-MM-DD format',
  })
  serviceDate: string;
}
