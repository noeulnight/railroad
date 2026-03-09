import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class TrainScheduleParamsDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class TrainScheduleQueryDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: 'date must be in YYYYMMDD format' })
  date: string;
}
