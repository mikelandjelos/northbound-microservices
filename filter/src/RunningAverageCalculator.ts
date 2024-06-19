export class RunningAverageCalculator {
  private _size: number;
  private _window: number[];
  private _runningSum: number;

  constructor(size: number) {
    this._size = size;
    this._window = [];
    this._runningSum = 0;
  }

  public get size(): number {
    return this._size;
  }

  public get window(): number[] {
    return this._window;
  }

  public get runningSum(): number {
    return this._runningSum;
  }

  addDataPoint(point: number): {
    deviationNominal: number;
    deviationPercent: number;
    runningAverage: number;
  } {
    if (this._window.length === this._size) {
      // Remove the oldest point from the sum and the window
      this._runningSum -= this._window.shift()!;
    }

    // Add the new point to the window and the running sum
    this._window.push(point);
    this._runningSum += point;

    // Calculate the running average
    const runningAverage = this._runningSum / this._window.length;
    const deviationNominal = point - runningAverage;
    const deviationPercent = (deviationNominal / point) * 100; // Calculate delta as a percentile

    return {
      deviationNominal,
      deviationPercent,
      runningAverage,
    };
  }
}
