export interface FilteredData {
  timestamp: string;
  type: string;
  device: string;
  measurement: string;
  lastValue: number | boolean;
  filtered: NumericData | BooleanData;
  historyLength: number;
}

export interface NumericData {
  deviationNominal: number;
  deviationPercent: number;
  runningAverage: number;
}

export interface BooleanData {
  truePercentage: number;
}

export enum SensorEventType {
  NUMERIC = "NUMERIC",
  BOOLEAN = "BOOLEAN",
}
