import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  SerializeOptions,
  Sse,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import {
  PublicTrainListResponseDto,
  PublicTrainScheduleResponseDto,
} from './dto/public-api-response.dto';
import {
  PublicTrainScheduleParamsDto,
  PublicTrainScheduleQueryDto,
} from './dto/public-train-request.dto';
import { PublicApiService } from './public-api.service';

@ApiTags('Public trains')
@Controller('v1/trains')
export class PublicTrainController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get()
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'List currently operating trains' })
  @ApiOkResponse({ type: PublicTrainListResponseDto })
  @SerializeOptions({
    type: PublicTrainListResponseDto,
    excludeExtraneousValues: true,
  })
  public async getTrains() {
    return this.publicApiService.getTrains();
  }

  @Get(':trainNo/schedule')
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'Get a train schedule for a Korean service date' })
  @ApiOkResponse({ type: PublicTrainScheduleResponseDto })
  @SerializeOptions({
    type: PublicTrainScheduleResponseDto,
    excludeExtraneousValues: true,
  })
  public async getSchedule(
    @Param() params: PublicTrainScheduleParamsDto,
    @Query() query: PublicTrainScheduleQueryDto,
  ) {
    return this.publicApiService.getSchedule(params.trainNo, query.serviceDate);
  }

  @Sse('events')
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'Stream train snapshots and position changes' })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'SSE events: snapshot, created, updated, and removed',
  })
  public trainEvents(@Req() request: Request): Observable<MessageEvent> {
    return this.publicApiService.createTrainEventsStream(request);
  }
}
