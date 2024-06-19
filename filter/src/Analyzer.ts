import {
  NUMERIC_MEASUREMENTS,
  BOOLEAN_MEASUREMENTS,
  EnvironmentalSensorTelemetryDTO,
} from "./EnvironmentalSensorTelemetryDTO";
import { RunningAverageCalculator } from "./RunningAverageCalculator";
import { RunningTruePercentageCalculator } from "./RunningTruePercentageCalculator";
import { FilteredData, SensorEventType } from "./FilteredData";

type MACAddress = string;
type MeasurementName = string;

type DeviceStatisticsCalculator = {
  numericMeasurements: Map<MeasurementName, RunningAverageCalculator>;
  booleanMeasurements: Map<MeasurementName, RunningTruePercentageCalculator>;
};

export class Analyzer {
  private devices: Map<MACAddress, DeviceStatisticsCalculator> = new Map();

  constructor(private windowSize: number) {}

  analyzeAndUpdate(
    sensorData: EnvironmentalSensorTelemetryDTO
  ): Array<FilteredData> {
    const deviceAddress: MACAddress = sensorData.device;

    let measurements: DeviceStatisticsCalculator | undefined =
      this.devices.get(deviceAddress);

    // If data from certain device is detected for the first time
    // - setup average calculators.
    if (measurements === undefined) {
      const numericMeasurements = new Map<
        MeasurementName,
        RunningAverageCalculator
      >();

      const booleanMeasurements = new Map<
        MeasurementName,
        RunningTruePercentageCalculator
      >();

      NUMERIC_MEASUREMENTS.forEach((name: MeasurementName) =>
        numericMeasurements.set(
          name,
          new RunningAverageCalculator(this.windowSize)
        )
      );

      BOOLEAN_MEASUREMENTS.forEach((name: MeasurementName) =>
        booleanMeasurements.set(
          name,
          new RunningTruePercentageCalculator(this.windowSize)
        )
      );

      measurements = {
        numericMeasurements: numericMeasurements,
        booleanMeasurements: booleanMeasurements,
      };

      this.devices.set(deviceAddress, measurements);
    }

    const sensorEvents: Array<FilteredData> = [];

    NUMERIC_MEASUREMENTS.forEach((name: MeasurementName) => {
      const measurement: number = sensorData[name];
      const dataPoint = measurements.numericMeasurements
        .get(name)
        ?.addDataPoint(measurement);

      if (dataPoint)
        sensorEvents.push({
          timestamp: sensorData._time,
          type: SensorEventType.NUMERIC,
          device: deviceAddress,
          measurement: name,
          lastValue: measurement,
          filtered: { ...dataPoint },
          historyLength: this.devices.size,
        });
    });

    BOOLEAN_MEASUREMENTS.forEach((name: MeasurementName) => {
      const measurement: boolean = sensorData[name];
      const dataPoint = measurements.booleanMeasurements
        .get(name)
        ?.addDataPoint(measurement);

      if (dataPoint)
        sensorEvents.push({
          timestamp: sensorData._time,
          type: SensorEventType.BOOLEAN,
          device: deviceAddress,
          measurement: name,
          lastValue: measurement,
          filtered: { ...dataPoint },
          historyLength: this.devices.size,
        });
    });

    return sensorEvents;
  }
}
