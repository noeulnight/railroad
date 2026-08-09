import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Direction } from 'src/korail/interfaces/train.interface';
import { PublicApiService } from 'src/public-api/public-api.service';
import { z } from 'zod';
import { filterTrains } from './utils/filter-trains.util';

@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly transports = new Map<
    string,
    StreamableHTTPServerTransport
  >();

  constructor(private readonly publicApiService: PublicApiService) {}

  public async onModuleDestroy() {
    await Promise.all(
      [...this.transports.values()].map((transport) => transport.close()),
    );
  }

  public async handle(request: Request, response: Response) {
    const sessionId = request.headers['mcp-session-id'];
    const transport =
      typeof sessionId === 'string'
        ? this.transports.get(sessionId)
        : undefined;

    if (transport) {
      await transport.handleRequest(request, response, request.body);
      return;
    }

    if (
      (request.body as { method?: string } | undefined)?.method !== 'initialize'
    ) {
      response.status(sessionId ? 404 : 400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'MCP session not found' },
        id: null,
      });
      return;
    }

    const newTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
    });
    newTransport.onclose = () => {
      if (newTransport.sessionId) {
        this.transports.delete(newTransport.sessionId);
      }
    };
    const server = this.createServer();
    await server.connect(newTransport);
    await newTransport.handleRequest(request, response, request.body);
    if (newTransport.sessionId) {
      this.transports.set(newTransport.sessionId, newTransport);
    }
  }

  private createServer() {
    const server = new McpServer({ name: 'korail', version: '0.0.1' });

    server.tool(
      'list_trains',
      '현재 운행 중인 열차를 필터링해 조회합니다.',
      {
        trainNo: z.string().optional().describe('열차번호 일부 또는 전체'),
        type: z.string().optional().describe('열차 종류 (예: KTX, ITX-새마을)'),
        direction: z
          .nativeEnum(Direction)
          .optional()
          .describe('운행 방향 (UP 또는 DOWN)'),
        station: z.string().optional().describe('출발·도착·현재·다음 역 이름'),
        delayedOnly: z.boolean().optional().describe('지연 열차만 조회'),
      },
      async (filters) => {
        const result = await this.publicApiService.getTrains();
        const trains = filterTrains(result.trains, filters);
        return this.text({
          trains,
          total: trains.length,
          polledAt: result.polledAt,
          availableTypes: [
            ...new Set(result.trains.map((train) => train.type)),
          ],
          availableDirections: [
            ...new Set(result.trains.map((train) => train.direction)),
          ],
        });
      },
    );

    server.tool(
      'get_train_detail',
      '열차의 현재 위치와 해당 운행일 시간표를 함께 조회합니다.',
      {
        trainNo: z.string().min(1).describe('열차번호'),
        serviceDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('한국 운행일 (YYYY-MM-DD), 생략하면 오늘'),
      },
      async ({ trainNo, serviceDate = this.todayInKorea() }) => {
        const [list, schedule] = await Promise.all([
          this.publicApiService.getTrains(),
          this.publicApiService.getSchedule(trainNo, serviceDate),
        ]);
        const current = list.trains.find((train) => train.trainNo === trainNo);
        return this.text({ trainNo, current: current ?? null, schedule });
      },
    );

    return server;
  }

  private todayInKorea(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
      new Date(),
    );
  }

  private text(data: unknown) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }
}
