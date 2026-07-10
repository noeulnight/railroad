import { Controller, Get, Header, SerializeOptions } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicStationResponseDto } from './dto/public-api-response.dto';
import { PublicApiService } from './public-api.service';

@ApiTags('Public stations')
@Controller('v1/stations')
export class PublicStationController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get()
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'List railway stations' })
  @ApiOkResponse({ type: PublicStationResponseDto, isArray: true })
  @SerializeOptions({
    type: PublicStationResponseDto,
    excludeExtraneousValues: true,
  })
  public async getStations() {
    return this.publicApiService.getStations();
  }
}
