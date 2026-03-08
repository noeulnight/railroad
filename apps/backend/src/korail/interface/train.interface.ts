export interface KorailTrain {
  type: string;
  id: string;
  geometry: Geometry;
  geometry_name: string;
  properties: Properties;
}

export interface Geometry {
  type: string;
  coordinates: number[];
}

export interface Properties {
  trn_no: string; // 열차 고유 번호
  trn_main_cat: string; // 열차 유형
  trn_clsf: string; // ktx srt mugungwha itx?
  up_dn: string; // 상행 하행
  trn_clsf_cd: string; //
  trn_case: string; // 열차 유형
  dpt_stn_nm: string; // 출발역
  dpt_pln_dttm: string; // 출발 시간
  arv_stn_nm: string; // 도착 역
  arv_pln_dttm: string; // 도착 시간
  now_stn: string; // 현재 역
  next_stn: string; // 다음 역 > 파싱 필요 ㅂㅅ새끼들
  delay?: number; // 현재 지연
  unif_delay?: number; // 예상 지연
  delay_source?: string; // 지연 사유?
  bearing: number; // 앵글
  bearing_v2: number; // 앵글 버전투?
  trn_opr_cd: number; // 운행사 코드
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
}
