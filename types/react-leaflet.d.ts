import { Icon } from "leaflet";

declare module "react-leaflet" {
  export interface MarkerProps {
    icon?: Icon | any;
  }
}
