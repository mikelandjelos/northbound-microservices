export interface EnvironmentalSensorTelemetryDTO {
  _time: string;
  carbon_oxide: number;
  device: string;
  humidity: number;
  light: boolean;
  liquid_petroleum_gas: number;
  motion: boolean;
  smoke: number;
  temperature: number;

  [key: string]: any;
}

const EXAMPLE_MESSAGE: EnvironmentalSensorTelemetryDTO = {
  _time: "2024-05-25T14:55:54.698Z",
  carbon_oxide: 0.004391003954583357,
  device: "1c:bf:ce:15:ec:4d",
  humidity: 78.19999694824219,
  light: true,
  liquid_petroleum_gas: 0.007009458543138704,
  motion: false,
  smoke: 0.01858890754005078,
  temperature: 27.0,
};

// Number typed measurements - carbon_oxide, humidity, etc.
export const NUMERIC_MEASUREMENTS: string[] = Object.keys(
  EXAMPLE_MESSAGE
).filter(
  (key) =>
    typeof EXAMPLE_MESSAGE[key as keyof EnvironmentalSensorTelemetryDTO] ===
    "number"
);

export const BOOLEAN_MEASUREMENTS: string[] = Object.keys(
  EXAMPLE_MESSAGE
).filter(
  (key) =>
    typeof EXAMPLE_MESSAGE[key as keyof EnvironmentalSensorTelemetryDTO] ===
    "boolean"
);
