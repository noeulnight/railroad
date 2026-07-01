import { registerAs } from '@nestjs/config';

export const serverConfig = registerAs('server', () => ({
  port: Number(process.env.PORT ?? 3000),
}));
