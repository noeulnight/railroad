import { HttpService } from '@nestjs/axios';
import { KorailBaseInterface } from './interface/base.interface';
import { KorailStation, Station } from './interface/station.interface';
import { Direction, KorailTrain } from './interface/train.interface';
import { parseKorailDateTime } from './utils/parse-korail-date-time.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import type { Train } from 'src/train/interface/train.interface';
import {
  KorailTimeInfo,
  Schedule,
  TimeInfo,
} from './interface/schedule.interface';

const STATIONS_CACHE_KEY = 'STATIONS';
const STATIONS_TTL_MS = 1000 * 60 * 60 * 24;

@Injectable()
export class KorailService {
  private readonly trainBbox =
    '121.74982535467505,31.983111467376006,132.99419960204577,41.07253721145443';
  private stationsByName?: Map<string, Station>;

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public async getStations(): Promise<Station[]> {
    const cached = await this.cacheManager.get<Station[]>(STATIONS_CACHE_KEY);
    if (cached) return this.cacheStations(cached);

    return this.fetchStations();
  }

  public async getTrains(): Promise<Train[]> {
    const [stations, trains] = await Promise.all([
      this.getStations(),
      firstValueFrom(
        this.httpService.get<KorailBaseInterface<KorailTrain>>('/train', {
          params: { bbox: this.trainBbox },
        }),
      ),
    ]);
    const stationsByName = this.getStationsByName(stations);

    return trains.data.features.map((features) => {
      const { properties, geometry } = features;
      const nextStation = properties.next_stn.split('>').pop()?.trim();

      return {
        id: properties.trn_no,
        type: properties.trn_case,
        direction: properties.up_dn === 'D' ? Direction.DOWN : Direction.UP,
        geometry: {
          bearing: properties.bearing_v2,
          longitude: geometry.coordinates[0],
          latitude: geometry.coordinates[1],
        },
        department: {
          station: this.findStation(properties.dpt_stn_nm, stationsByName),
          date: parseKorailDateTime(properties.dpt_pln_dttm),
        },
        arrival: {
          stations: this.findStation(properties.arv_stn_nm, stationsByName),
          date: parseKorailDateTime(properties.arv_pln_dttm),
        },
        currentStation: this.findStation(properties.now_stn, stationsByName),
        nextStation: this.findStation(nextStation, stationsByName),
        delay: properties.delay || 0,
      };
    });
  }

  public async getSchedule(id: string, date: string): Promise<Schedule[]> {
    const [stations, response] = await Promise.all([
      this.getStations(),
      firstValueFrom(
        this.httpService.post<KorailTimeInfo>(
          `https://www.korail.com/classes/com.korail.mobile.trainsInfo.TrainSchedule`,
          { txtRunDt: date, txtTrnNo: id, Device: 'BH', Version: '999999999' },
          { headers: { 'Content-Type': 'multipart/form-data' } },
        ),
      ),
    ]);
    const stationsByName = this.getStationsByName(stations);

    return (response.data.time_infos?.time_info ?? []).map((timeInfo) =>
      this.mapSchedule(timeInfo, stationsByName),
    );
  }

  private async fetchStations(): Promise<Station[]> {
    const stations = await firstValueFrom(
      this.httpService.get<KorailBaseInterface<KorailStation>>('/data/station'),
    );

    const parsedStations: Station[] = stations.data.features
      .filter((data) => data.properties.grade !== null)
      .map((feature) => {
        const geometry = feature.geometry;

        return {
          name: feature.properties.name,
          grade: feature.properties.grade,
          ...(geometry
            ? {
                geometry: {
                  longitude: geometry.coordinates[0],
                  latitude: geometry.coordinates[1],
                },
              }
            : {}),
        };
      });

    await this.cacheManager.set<Station[]>(
      STATIONS_CACHE_KEY,
      parsedStations,
      STATIONS_TTL_MS,
    );

    return this.cacheStations(parsedStations);
  }

  private cacheStations(stations: Station[]): Station[] {
    this.stationsByName = this.buildStationsByName(stations);

    return stations;
  }

  private getStationsByName(stations: Station[]): Map<string, Station> {
    if (!this.stationsByName || this.stationsByName.size !== stations.length) {
      this.stationsByName = this.buildStationsByName(stations);
    }

    return this.stationsByName;
  }

  private buildStationsByName(stations: Station[]): Map<string, Station> {
    return new Map(stations.map((station) => [station.name, station]));
  }

  private findStation(
    name: string | undefined,
    stationsByName: Map<string, Station>,
  ): Station | undefined {
    const normalizedName = name?.trim();

    if (!normalizedName) {
      return undefined;
    }

    return stationsByName.get(normalizedName);
  }

  private mapSchedule(
    timeInfo: TimeInfo,
    stationsByName: Map<string, Station>,
  ): Schedule {
    const stationName =
      timeInfo.h_stop_rs_stn_nm?.trim() || timeInfo.h_stop_rs_stn_cd;
    const station = this.findStation(stationName, stationsByName) ?? {
      name: stationName,
    };
    const baseDate =
      this.parseScheduleDateOnly(timeInfo.h_arv_dt) ??
      this.parseScheduleDateOnly(timeInfo.h_dpt_dt) ??
      new Date();
    const arrivalTime = this.parseScheduleDateTime(
      timeInfo.h_arv_dt,
      timeInfo.h_arv_tm,
    );
    const departureTime = this.parseScheduleDateTime(
      timeInfo.h_dpt_dt,
      timeInfo.h_dpt_tm,
    );

    return {
      id: timeInfo.h_stop_rs_stn_cd,
      date: arrivalTime ?? departureTime ?? baseDate,
      delay: Number(timeInfo.h_act_arv_dlay_tnum || '0'),
      station,
      arrivalTime,
      departureTime,
    };
  }

  private parseScheduleDateTime(date: string, time: string): Date | undefined {
    if (!/^\d{8}$/.test(date)) {
      return undefined;
    }

    if (!/^\d{6}$/.test(time) || time === '999999') {
      return undefined;
    }

    try {
      return parseKorailDateTime(`${date}${time}`);
    } catch {
      return undefined;
    }
  }

  private parseScheduleDateOnly(date: string): Date | undefined {
    if (!/^\d{8}$/.test(date)) {
      return undefined;
    }

    try {
      return parseKorailDateTime(`${date}000000`);
    } catch {
      return undefined;
    }
  }
}
