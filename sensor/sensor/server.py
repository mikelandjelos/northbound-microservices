import logging
import os

from . import sensor

logging.basicConfig(level=logging.INFO)


def main():
    logging.warning("Server is starting")

    device_mac_addr = os.getenv("DEVICE_MAC_ADDR")

    if device_mac_addr is None:
        logging.critical("No DEVICE_MAC_ADDR envvar set!")
        raise EnvironmentError("No DEVICE_MAC_ADDR envvar set!")

    sensor.run(device_mac_addr=device_mac_addr)


if __name__ == "__main__":
    main()
