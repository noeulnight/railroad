import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Direction } from 'src/korail/interfaces/train.interface';

export class PublicPositionResponseDto {
  @Expose()
  @ApiProperty({ example: 126.9707 })
  longitude: number;

  @Expose()
  @ApiProperty({ example: 37.5547 })
  latitude: number;
}

export class PublicTrainPositionResponseDto extends PublicPositionResponseDto {
  @Expose()
  @ApiProperty({ description: 'Heading in degrees', example: 145 })
  bearing: number;
}

export class PublicStationResponseDto {
  @Expose()
  @ApiProperty({ example: '서울' })
  name: string;

  @Expose()
  @ApiPropertyOptional({ example: 1 })
  grade?: number;

  @Expose()
  @Type(() => PublicPositionResponseDto)
  @ApiPropertyOptional({ type: PublicPositionResponseDto })
  position?: PublicPositionResponseDto;
}

export class PublicRouteEndpointResponseDto {
  @Expose()
  @Type(() => PublicStationResponseDto)
  @ApiPropertyOptional({ type: PublicStationResponseDto })
  station?: PublicStationResponseDto;

  @Expose()
  @ApiProperty({ format: 'date-time', example: '2026-07-10T00:00:00.000Z' })
  scheduledAt: string;
}

export class PublicTrainResponseDto {
  @Expose()
  @ApiProperty({ example: '001' })
  trainNo: string;

  @Expose()
  @ApiProperty({ example: 'KTX' })
  type: string;

  @Expose()
  @ApiProperty({ enum: Direction })
  direction: Direction;

  @Expose()
  @Type(() => PublicTrainPositionResponseDto)
  @ApiProperty({ type: PublicTrainPositionResponseDto })
  position: PublicTrainPositionResponseDto;

  @Expose()
  @Type(() => PublicRouteEndpointResponseDto)
  @ApiProperty({ type: PublicRouteEndpointResponseDto })
  departure: PublicRouteEndpointResponseDto;

  @Expose()
  @Type(() => PublicRouteEndpointResponseDto)
  @ApiProperty({ type: PublicRouteEndpointResponseDto })
  arrival: PublicRouteEndpointResponseDto;

  @Expose()
  @Type(() => PublicStationResponseDto)
  @ApiPropertyOptional({ type: PublicStationResponseDto })
  currentStation?: PublicStationResponseDto;

  @Expose()
  @Type(() => PublicStationResponseDto)
  @ApiPropertyOptional({ type: PublicStationResponseDto })
  nextStation?: PublicStationResponseDto;

  @Expose()
  @ApiProperty({ example: 3 })
  delayMinutes: number;

  @Expose()
  @ApiProperty({
    description: 'Estimated speed from the two latest distinct positions',
    example: 248.6,
    nullable: true,
    type: Number,
  })
  speedKmh: number | null;
}

export class PublicTrainListResponseDto {
  @Expose()
  @Type(() => PublicTrainResponseDto)
  @ApiProperty({ type: PublicTrainResponseDto, isArray: true })
  trains: PublicTrainResponseDto[];

  @Expose()
  @ApiProperty({ example: 128 })
  total: number;

  @Expose()
  @ApiProperty({ format: 'date-time', example: '2026-07-10T00:00:00.000Z' })
  polledAt: string;
}

export class PublicScheduleStopResponseDto {
  @Expose()
  @ApiProperty({ example: '0001' })
  stationCode: string;

  @Expose()
  @Type(() => PublicStationResponseDto)
  @ApiProperty({ type: PublicStationResponseDto })
  station: PublicStationResponseDto;

  @Expose()
  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-07-10T00:00:00.000Z',
  })
  arrivalAt?: string;

  @Expose()
  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-07-10T00:02:00.000Z',
  })
  departureAt?: string;

  @Expose()
  @ApiProperty({ example: 0 })
  delayMinutes: number;
}

export class PublicTrainScheduleResponseDto {
  @Expose()
  @ApiProperty({ example: '001' })
  trainNo: string;

  @Expose()
  @ApiProperty({ format: 'date', example: '2026-07-10' })
  serviceDate: string;

  @Expose()
  @Type(() => PublicScheduleStopResponseDto)
  @ApiProperty({ type: PublicScheduleStopResponseDto, isArray: true })
  stops: PublicScheduleStopResponseDto[];
}
