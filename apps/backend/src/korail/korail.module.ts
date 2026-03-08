import { Module } from '@nestjs/common';
import { KorailService } from './korail.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://gis.korail.com/api',
      headers: {
        Referer: 'https://gis.korail.com/korailTalk/entrance',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    }),
  ],
  providers: [KorailService],
  exports: [KorailService],
})
export class KorailModule {}
