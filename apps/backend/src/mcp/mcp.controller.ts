import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @All()
  public async handle(@Req() request: Request, @Res() response: Response) {
    await this.mcpService.handle(request, response);
  }
}
