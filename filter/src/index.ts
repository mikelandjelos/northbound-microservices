import mqtt from "mqtt";
import { connect, StringCodec } from "nats";
import { EnvironmentalSensorTelemetryDTO } from "./EnvironmentalSensorTelemetryDTO";
import { Analyzer } from "./Analyzer";
import { FilteredData } from "./FilteredData";

function main() {
  const {
    MQTT_BROKER_HOST,
    MQTT_BROKER_PORT,
    TARGET_DEVICE,
    WINDOW_SIZE,
    NATS_HOST,
    NATS_PORT,
  } = process.env;

  if (MQTT_BROKER_HOST == undefined)
    throw `Missing environment variable for MQTT_BROKER_HOST`;

  if (MQTT_BROKER_PORT == undefined)
    throw `Missing environment variable for MQTT_BROKER_PORT`;

  if (WINDOW_SIZE == undefined)
    throw `Missing environment variable for WINDOW_SIZE`;

  if (NATS_HOST == undefined)
    throw `Missing environment variable for NATS_HOST`;

  if (NATS_PORT == undefined)
    throw `Missing environment variable for NATS_PORT`;

  const mqttConnectionUrl = `mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`;

  // `#` means ALL DEVICES - wildcard
  const sensorMeasurementsMqttTopic = `sensor/measurements/${
    TARGET_DEVICE ?? "#"
  }`;

  const clientId = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(8, "0");

  console.log(`Analytics service number ${clientId} is starting!`);

  const mqttClient = mqtt.connect(mqttConnectionUrl, {
    clientId: `est-analytics-${clientId}`,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  });

  mqttClient.on("connect", () => {
    console.log("Connected");
    mqttClient.subscribe(sensorMeasurementsMqttTopic, () => {
      console.log(`Subscribed to topic '${sensorMeasurementsMqttTopic}'`);
    });
  });

  const analyzer: Analyzer = new Analyzer(Number.parseInt(WINDOW_SIZE));

  mqttClient.on("message", async (topic, payload) => {
    const environmentalSensorData: EnvironmentalSensorTelemetryDTO = JSON.parse(
      payload.toString()
    );

    const sensorEvents = analyzer.analyzeAndUpdate(environmentalSensorData);

    const natsConnectionUrl = `nats://${NATS_HOST}:${NATS_PORT}`;

    const natsClient = await connect({ servers: natsConnectionUrl });

    if (!natsClient.isClosed())
      console.log(`Connected to NATS server on '${natsConnectionUrl}'!`);
    else
      console.log(`Couldn't connect to NATS server on '${natsConnectionUrl}'!`);

    const deviceMac: string = topic.split("/").reverse()[0];

    const sensorStatisticsNatsTopic = `sensor.statistics.${deviceMac}`;

    const codec = StringCodec();

    sensorEvents.forEach(async (data: FilteredData) => {
      console.log(
        `Publishing ${JSON.stringify(data)} to ${sensorStatisticsNatsTopic}`
      );

      natsClient.publish(
        sensorStatisticsNatsTopic,
        codec.encode(JSON.stringify(data))
      );
    });

    await natsClient.drain();
  });

  mqttClient.on("error", (err) => {
    console.error("Error:", err);
  });
}

if (require.main === module) {
  main();
}
