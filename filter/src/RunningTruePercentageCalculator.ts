export class RunningTruePercentageCalculator {
  private _size: number;
  private _window: boolean[];
  private _trueCount: number;

  constructor(size: number) {
    this._size = size;
    this._window = [];
    this._trueCount = 0;
  }

  public get size(): number {
    return this._size;
  }

  public get window(): boolean[] {
    return this._window;
  }

  public get trueCount(): number {
    return this._trueCount;
  }

  addDataPoint(point: boolean): {
    truePercentage: number;
  } {
    if (this._window.length === this._size) {
      const removedPoint = this._window.shift()!;
      if (removedPoint) {
        this._trueCount -= 1;
      }
    }

    this._window.push(point);
    if (point) {
      this._trueCount += 1;
    }

    const truePercentage = (this._trueCount / this._window.length) * 100;

    return { truePercentage };
  }
}
