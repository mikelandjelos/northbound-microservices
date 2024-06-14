import datetime
import json
import logging
import sys
import time

from .environmental_sensor_telemetry_data import EnvironmentalSensorTelemetryData
from .influxdb_util import get_configured_influxdb_client, get_default_bucket
from .mqtt_util import get_configured_mqtt_broker_client

logging.basicConfig(level=logging.INFO)


def run(device_mac_addr: str):
    DATASET_START_TIME = "2020-07-12T02:01:34Z"

    time.sleep(5)

    influx_client = get_configured_influxdb_client()

    if not influx_client.ping():
        raise RuntimeError("Couldn't connect to InfluxDB")

    logging.info("Successfully connected to InfluxDB")

    if device_mac_addr is None:
        raise RuntimeError("Device MAC address not provided!")

    logging.info(f"Generating data for device: `{device_mac_addr}`")

    mqtt_client = get_configured_mqtt_broker_client(f"est-{device_mac_addr}")
    mqtt_client.loop_start()

    topic = f"sensor/measurements/{device_mac_addr}"

    current_time = DATASET_START_TIME

    while True:
        query_string = f"""
        from(bucket: "{get_default_bucket()}")
            |> range(start: time(v: "{current_time}"))
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> filter(fn: (r) => r["device"] == "{device_mac_addr}")
            |> limit(n: 2, offset: 0)
        """

        tables = influx_client.query_api().query(query_string)

        est_record_first = EnvironmentalSensorTelemetryData.from_dict(
            tables[0].records[0].values
        )
        est_record_second = EnvironmentalSensorTelemetryData.from_dict(
            tables[0].records[1].values
        )

        time_to_next_measurement = est_record_second._time - est_record_first._time

        logging.info(est_record_first.to_dict())
        logging.info(
            f"Time to next measurement: {time_to_next_measurement.total_seconds()}s"
        )

        est_record_first._time = datetime.datetime.now(tz=None)
        payload = json.dumps(
            est_record_first.to_dict(),
            default=lambda date: date.isoformat(timespec="milliseconds") + "Z",
        )

        mqtt_client.publish(topic, payload, qos=1)

        sys.stdout.flush()
        time.sleep(time_to_next_measurement.total_seconds())

        current_time = (
            est_record_second._time.replace(tzinfo=None).isoformat(
                timespec="milliseconds"
            )
            + "Z"
        )
