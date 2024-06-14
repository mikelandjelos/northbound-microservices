from dataclasses import asdict, dataclass, fields
from datetime import datetime


@dataclass
class EnvironmentalSensorTelemetryData:
    _time: datetime
    carbon_oxide: float
    device: str
    humidity: float
    light: bool
    liquid_petroleum_gas: float
    motion: bool
    smoke: float
    temperature: float

    @classmethod
    def from_dict(cls, data: dict):
        field_names = {f.name for f in fields(cls)}
        filtered_data = {
            key: value for key, value in data.items() if key in field_names
        }
        return cls(**filtered_data)

    def to_dict(self):
        return asdict(self)
