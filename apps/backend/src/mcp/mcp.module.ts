import { Module } from '@nestjs/common';
import { PublicApiModule } from 'src/public-api/public-api.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [PublicApiModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
