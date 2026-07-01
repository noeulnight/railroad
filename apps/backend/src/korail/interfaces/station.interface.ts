export interface KorailStation {
  type: string;
  id: string;
  geometry?: Geometry;
  geometry_name: string;
  properties: Properties;
}

export interface Geometry {
  type: string;
  coordinates: number[];
}

export interface Properties {
  name: string;
  grade?: number;
  shown_layer: string;
  text_offset_x?: number;
  text_offset_y?: number;
}

export interface Station {
  name: string;
  grade?: number;
  geometry?: {
    longitude: number;
    latitude: number;
  };
}
