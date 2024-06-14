import logging
import os
from pathlib import Path

from influxdb_client import InfluxDBClient


def get_configured_influxdb_client() -> InfluxDBClient:
    url = os.getenv("INFLUXDB_URL")

    if url is None:
        logging.critical("No INFLUXDB_URL envvar set!")
        raise EnvironmentError("No INFLUXDB_URL envvar set!")

    token = Path("/run/secrets/influx-token").read_text()

    if token is None:
        logging.critical("No token secret found!")
        raise EnvironmentError("No token secret found!")

    organization = os.getenv("INFLUXDB_ORG")

    if organization is None:
        logging.critical("No INFLUXDB_ORG envvar set!")
        raise EnvironmentError("No INFLUXDB_ORG envvar set!")

    logging.critical(f"URL: {url}\nTOKEN: {token}\nORGANIZATION: {organization}")

    return InfluxDBClient(
        url=url,
        token=token,
        org=organization,
    )


def get_default_bucket() -> str:
    bucket = os.getenv("INFLUXDB_BUCKET")

    if bucket is None:
        logging.critical("No INFLUXDB_BUCKET envvar set!")
        raise EnvironmentError("No INFLUXDB_BUCKET envvar set!")

    return bucket
