import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class RailwayTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  z: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_048_575)
  x: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_048_575)
  y: number;
}
