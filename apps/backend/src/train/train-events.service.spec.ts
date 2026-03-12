import { EventEmitter } from 'events';
import { of } from 'rxjs';
import { TrainEventsService } from './train-events.service';
import { TrainPollingService } from './runtime/train-polling.service';
import { TrainStreamBroadcasterService } from './runtime/train-stream-broadcaster.service';

describe('TrainEventsService', () => {
  let pollingService: jest.Mocked<Pick<TrainPollingService, 'start' | 'stop'>>;
  let broadcaster: jest.Mocked<
    Pick<TrainStreamBroadcasterService, 'createEventsStream'>
  >;
  let service: TrainEventsService;

  beforeEach(() => {
    pollingService = {
      start: jest.fn(),
      stop: jest.fn(),
    };
    broadcaster = {
      createEventsStream: jest.fn().mockReturnValue(of()),
    };
    service = new TrainEventsService(
      pollingService as unknown as TrainPollingService,
      broadcaster as unknown as TrainStreamBroadcasterService,
    );
  });

  it('starts and stops polling with module lifecycle', () => {
    service.onModuleInit();
    service.onModuleDestroy();

    expect(pollingService.start).toHaveBeenCalledTimes(1);
    expect(pollingService.stop).toHaveBeenCalledTimes(1);
  });

  it('delegates event stream creation to the broadcaster', () => {
    const request = new EventEmitter();

    const stream = service.createEventsStream(
      request as unknown as Pick<EventEmitter, 'on' | 'off'>,
    );

    expect(broadcaster.createEventsStream).toHaveBeenCalledWith(request);
    expect(stream).toBeDefined();
  });
});
