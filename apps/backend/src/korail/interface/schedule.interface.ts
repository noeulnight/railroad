import { Station } from './station.interface';

export interface KorailTimeInfo {
  h_msg_cd: string;
  h_run_dt: string;
  h_trn_gp_cd: string;
  strResult: string;
  h_msg_txt: string;
  time_infos: TimeInfos;
  h_trn_clsf_cd: string;
  h_trn_no: string;
  h_rslt_cnt: string;
}

export interface TimeInfos {
  time_info: TimeInfo[];
}

export interface TimeInfo {
  h_dpt_dt: string;
  h_act_arv_dlay_tnum: string;
  h_dpt_tm: string;
  h_arv_dt: string;
  h_stop_rs_stn_nm: string;
  h_arv_tm: string;
  h_stn_cons_ordr: string;
  h_stop_rs_stn_cd: string;
}

export interface Schedule {
  id: string;
  date: Date;
  delay: number;
  station: Station;
  arrivalTime?: Date;
  departureTime?: Date;
}
