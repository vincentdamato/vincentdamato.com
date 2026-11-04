declare module "world-atlas/countries-110m.json" {
  import type { Topology } from "topojson-specification";
  const value: Topology;
  export default value;
}

declare module "*/regions.json" {
  import type { Feature } from "geojson";
  const value: { europe: Feature[]; usa: Feature[] };
  export default value;
}
