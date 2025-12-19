declare module "leaflet" {
  export type LatLngExpression =
    | [number, number]
    | { lat: number; lng: number }
    | { lat: number; lon: number }
    | { lat: number; long: number };

  export interface IconOptions {
    iconUrl?: string;
    iconRetinaUrl?: string;
    shadowUrl?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
  }

  export class Icon {
    constructor(options?: IconOptions);
  }

  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    attributionControl?: boolean;
  }
}
