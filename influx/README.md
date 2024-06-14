# Setting up InfluxDB

- `docker network create iots-bridge` - creating the bridge network for our containers;

## InfluxDB original image and initial settings

- InfluxDB service running in a container (this will later be done through a section in a docker-compose file):

```sh
docker run -d \
 --name iots-influxdb \
 -p 8086:8086 \
 -v ./influxdb2-data:/var/lib/influxdb2 \
 -v ./influxdb2-config:/etc/influxdb2 \
 -e DOCKER_INFLUXDB_INIT_MODE=setup \
 -e DOCKER_INFLUXDB_INIT_USERNAME=mihajlo \
 -e DOCKER_INFLUXDB_INIT_PASSWORD=iotsiotsiots \
 -e DOCKER_INFLUXDB_INIT_ORG=IoTSOrg \
 -e DOCKER_INFLUXDB_INIT_BUCKET=EnvironmentalSensorTelemetry \
 -e DOCKER_INFLUXDB_INIT_RETENTION=0 \
 --network iots-bridge \
 influxdb:2
```

## Transforming the dataset

- This needed to be done, because InfluxDB has strict rules on how the data from a csv file should be imported, if you want it to be structured in some way; more on this can be read [here](https://docs.influxdata.com/influxdb/cloud/reference/syntax/annotated-csv/#data-types);
- Python script for transforming the chosen [dataset](https://www.kaggle.com/datasets/garystafford/environmental-sensor-data-132k?resource=download) into format compatible with InfluxDB csv importer:

```python
import csv
import datetime
from dataclasses import dataclass, fields
from typing import List


@dataclass
class EnvironmentalSensorTelemetryData:
    timestamp: datetime
    device: str
    carbon_oxide: float
    humidity: float
    light: bool
    liquid_petroleum_gas: float
    motion: bool
    smoke: float
    temperature: float


if __name__ == "__main__":
    csv_records: List[EnvironmentalSensorTelemetryData] = []

    with open(
        "./iot_telemetry_data.csv",
        "rt",
    ) as input_csv_file:
        csv_reader = csv.reader(input_csv_file)

        # Skip the first row
        next(csv_reader)

        for row in csv_reader:
            timestamp = datetime.datetime.fromtimestamp(float(row[0]))
            rfc3339_timestamp = timestamp.isoformat() + "Z"
            (
                device,
                carbon_oxide,
                humidity,
                light,
                liquid_petroleum_gas,
                motion,
                smoke,
                temperature,
            ) = row[1:]
            record = EnvironmentalSensorTelemetryData(
                timestamp=rfc3339_timestamp,
                device=device,
                carbon_oxide=float(carbon_oxide),
                humidity=float(humidity),
                light=light.lower() == "true",
                liquid_petroleum_gas=float(liquid_petroleum_gas),
                motion=motion.lower() == "true",
                smoke=float(smoke),
                temperature=float(temperature),
            )
            csv_records.append(record)

    # Write to another file, ready for getting ingested by the InfluxDB
    with open(
        "./environmental_sensor_telemetry_data.csv",
        "wt",
        newline="",
    ) as output_csv_file:
        csv_writer = csv.writer(output_csv_file)

        # Write the header
        csv_writer.writerows(
            [
                [
                    "#datatype measurement",
                    "time",
                    "tag",
                    "double",
                    "double",
                    "boolean",
                    "double",
                    "boolean",
                    "double",
                    "double",
                ],
                [
                    "est_data",
                    "timestamp",
                    "device",
                    "carbon_oxide",
                    "humidity",
                    "light",
                    "liquid_petroleum_gas",
                    "motion",
                    "smoke",
                    "temperature",
                ],
            ]
        )

        for record in csv_records:
            # Convert boolean values to lowercase strings
            light = "true" if record.light else "false"
            motion = "true" if record.motion else "false"
            csv_writer.writerow(
                [
                    "sensor_data",
                    record.timestamp,
                    record.device,
                    record.carbon_oxide,
                    record.humidity,
                    light,
                    record.liquid_petroleum_gas,
                    motion,
                    record.smoke,
                    record.temperature,
                ]
            )

    print("CSV write complete!")
```

- Before:

```csv
"ts","device","co","humidity","light","lpg","motion","smoke","temp"
"1.5945120943859746E9","b8:27:eb:bf:9d:51","0.004955938648391245","51.0","false","0.00765082227055719","false","0.02041127012241292","22.7"
...
```

- After:
  - added datatype row which defines the "schema" for our records;
  - added the row for our "column names";
  - transformed all rows so they can be imported into InfluxDB;

```csv
#datatype measurement,time,tag,double,double,boolean,double,boolean,double,double
est_data,timestamp,device,carbon_oxide,humidity,light,liquid_petroleum_gas,motion,smoke,temperature
sensor_data,2020-07-12T02:01:34.385975Z,b8:27:eb:bf:9d:51,0.004955938648391245,51.0,false,0.00765082227055719,false,0.02041127012241292,22.7
...
```

## Finally, importing

- we first need to get our CSV file "into" the container -
  `docker exec -it iots-influxdb bash` - to access the container shell
  and after that `touch environmental_sensors_telemetry_data.csv` - to create a new CSV (check with `ls` if there is one after that);
- then we need to exit the containers shell (bash), and copy the data from our host to the container
  `docker cp ./environmental_sensor_telemetry_data.csv iots-influxdb:/environmental_sensor_telemetry_data.csv`;
- after all of that, we once again need to access the containers shell with the same `docker exec` command, and import CSV data using the InfluxDB CLI tool - `influx` -  the command is `influx write -b EnvironmentalSensorTelemetry -f ./environmental_sensor_telemetry_data.csv` - wait for a few seconds, and then you can go to `http://localhost:8086/` and write a query:

```influxql
from(bucket: "EnvironmentalSensorTelemetry")
  |> range(start: 2020-07-12T02:01:34.385975Z, stop: 2020-07-20T02:03:37.264313Z)
  |> filter(fn: (r) => r["_measurement"] == "sensor_data" and r["_field"] == "carbon_oxide")
```

- if this gives results, data has been imported correctly;

## Automatization

- Since we now know how to import data, and have a CSV file ready for importing, we can use the mechanisms of Docker volumes and `influxdb` image custom initialization scripts to import our data into the database right from the start, i.e. when running the container. We need to change `docker run` command a little bit:

```sh
docker run -d \
 --name iots-influxdb \
 -p 8086:8086 \
 -v ./influxdb2-data:/var/lib/influxdb2 \
 -v ./influxdb2-config:/etc/influxdb2 \
 -v ./environmental_sensor_telemetry_data.csv:/environmental_sensor_telemetry_data.csv \ # Mounting the data file
 -v ./scripts:/docker-entrypoint-initdb.d \ # Mounting custom scripts
 -e DOCKER_INFLUXDB_INIT_MODE=setup \
 -e DOCKER_INFLUXDB_INIT_USERNAME=mihajlo \
 -e DOCKER_INFLUXDB_INIT_PASSWORD=iotsiotsiots \
 -e DOCKER_INFLUXDB_INIT_ORG=IoTSOrg \
 -e DOCKER_INFLUXDB_INIT_BUCKET=EnvironmentalSensorTelemetry \
 -e DOCKER_INFLUXDB_INIT_RETENTION=0 \
 --network iots-bridge \
 influxdb:2
```

- we must also create a `scripts` directory and inside it make our script for data importing - `import_data.csv`:

```sh
#!/bin/bash

influx write -b EnvironmentalSensorTelemetry -f /environmental_sensor_telemetry_data.csv
```

- we then need to grant permissions for executing - `sudo chmod +x import_data.sh`;
- we can now execute the `docker run` command;

## Docker compose

```yml
version: '3.8'

services:

    # ...

  iots-influxdb:
    image: influxdb:2
    container_name: iots-influxdb
    ports:
      - "8086:8086"
    volumes:
      - ./influx/influxdb2-data:/var/lib/influxdb2
      - ./influx/influxdb2-config:/etc/influxdb2
      - ./influx/environmental_sensor_telemetry_data.csv:/environmental_sensor_telemetry_data.csv
      - ./influx/scripts:/docker-entrypoint-initdb.d
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=mihajlo
      - DOCKER_INFLUXDB_INIT_PASSWORD=iotsiotsiots
      - DOCKER_INFLUXDB_INIT_ORG=IoTSOrg
      - DOCKER_INFLUXDB_INIT_BUCKET=EnvironmentalSensorTelemetry
      - DOCKER_INFLUXDB_INIT_RETENTION=0
    networks:
      - iots-bridge

    # ...

networks:
  iots-bridge:
    name: iots_bridge

```

[Go back to main README.md](../README.md).
