# RAILROAD Public API v1

RAILROAD Public API는 현재 운행 중인 열차, 운행 스케줄, 역 정보와 실시간 위치 변경을 제공하는 비공식 읽기 전용 API입니다.

## 기본 주소

- 공개 게이트웨이: `https://train.lth.so/api/v1`
- 로컬 백엔드 직접 접속: `http://localhost:3000/v1`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

공개 게이트웨이는 `/api`를 제거한 뒤 백엔드로 전달하므로, OpenAPI 문서에는 서버 주소 `/api`와 백엔드 라우트 `/v1/...`가 함께 정의됩니다.

## 공통 규칙

- 인증과 API 키는 사용하지 않습니다.
- IP 기반 rate limit은 적용하지 않습니다.
- 응답 시간은 ISO 8601 UTC 문자열입니다.
- `serviceDate`는 대한민국 현지 운행일이며 `YYYY-MM-DD` 형식입니다.
- `trainNo`는 운행일마다 재사용될 수 있습니다. 특정 운행은 `serviceDate`와 `trainNo` 조합으로 식별해야 합니다.
- 브라우저의 읽기 요청을 위해 `Access-Control-Allow-Origin: *`를 반환합니다.

## 엔드포인트

### `GET /v1/trains`

현재 운행 열차 snapshot을 반환합니다. 백엔드 polling snapshot이 준비되지 않은 시작 구간에서만 데이터 제공자를 직접 조회합니다.

snapshot은 프로세스 메모리에만 유지됩니다. 서버가 재시작되면 초기화되고 다음 polling에서 다시 채워지며, 과거 snapshot이나 이벤트 이력은 제공하지 않습니다.

`speedKmh`는 마지막 두 개의 서로 다른 위치와 그 사이의 실제 경과 시간으로 계산한 평균 추정 속도입니다. 위치가 반복되면 시간 기준점을 갱신하지 않으며, 첫 표본이거나 시속 350km를 초과하는 비정상 점프는 `null`을 반환합니다.

```json
{
  "trains": [
    {
      "trainNo": "001",
      "type": "KTX",
      "direction": "DOWN",
      "position": {
        "longitude": 126.9707,
        "latitude": 37.5547,
        "bearing": 145
      },
      "departure": {
        "station": { "name": "서울", "grade": 1 },
        "scheduledAt": "2026-07-10T00:00:00.000Z"
      },
      "arrival": {
        "station": { "name": "부산", "grade": 1 },
        "scheduledAt": "2026-07-10T02:30:00.000Z"
      },
      "currentStation": { "name": "대전" },
      "nextStation": { "name": "동대구" },
      "delayMinutes": 3,
      "speedKmh": 248.6
    }
  ],
  "total": 1,
  "polledAt": "2026-07-10T00:00:05.000Z"
}
```

### `GET /v1/trains/:trainNo/schedule?serviceDate=YYYY-MM-DD`

특정 열차의 운행일 스케줄을 반환합니다. 동일한 `trainNo`와 `serviceDate` 조회 결과는 1분간 캐시합니다.

```json
{
  "trainNo": "001",
  "serviceDate": "2026-07-10",
  "stops": [
    {
      "stationCode": "0001",
      "station": { "name": "서울", "grade": 1 },
      "departureAt": "2026-07-10T00:00:00.000Z",
      "delayMinutes": 0
    }
  ]
}
```

### `GET /v1/stations`

역 이름, 등급과 좌표를 반환합니다. 좌표가 제공되지 않는 역은 `position`이 없습니다.

### `GET /v1/trains/events`

SSE로 `snapshot`, `created`, `updated`, `removed` 이벤트를 전송합니다. 연결 직후 최신 `snapshot`을 먼저 받고 이후 위치 변경 이벤트를 받습니다.

```text
event: updated
data: {"train":{"trainNo":"001"},"previousPosition":{"longitude":126.9,"latitude":37.5,"bearing":140},"polledAt":"2026-07-10T00:00:05.000Z"}
```

## 데이터 출처

이 API는 KORAIL 관련 공개 웹 데이터에 기반한 서드파티 서비스이며 KORAIL이 운영하거나 보증하는 공식 API가 아닙니다. 실시간 위치와 지연 정보는 누락되거나 실제 운행 상태와 다를 수 있습니다.
