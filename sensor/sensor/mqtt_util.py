import logging
import os

from paho.mqtt import client as mqtt_client


def get_configured_mqtt_broker_client(client_name: str) -> mqtt_client.Client:
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            logging.debug("Connected to MQTT Broker!")
        else:
            logging.critical("Failed to connect, return code %d\n", rc)

    def on_publish(client, userdata, mid):
        logging.debug(f"Message {mid} published!")

    client = mqtt_client.Client(client_id=client_name)

    client.on_connect = on_connect
    client.on_publish = on_publish

    MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST")

    if MQTT_BROKER_HOST is None:
        logging.critical("No MQTT_BROKER_HOST envvar set!")
        raise EnvironmentError("No MQTT_BROKER_HOST envvar set!")

    MQTT_BROKER_PORT = os.getenv("MQTT_BROKER_PORT")

    if MQTT_BROKER_PORT is None:
        logging.critical("No MQTT_BROKER_PORT envvar set!")
        raise EnvironmentError("No MQTT_BROKER_PORT envvar set!")

    client.connect(host=MQTT_BROKER_HOST, port=int(MQTT_BROKER_PORT))

    return client
