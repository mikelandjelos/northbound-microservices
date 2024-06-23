package com.dashboard;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONObject;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.InfluxDBClientOptions;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;

import io.nats.client.Nats;
import io.nats.client.Options;
import io.nats.client.Connection;
import io.nats.client.Dispatcher;

public class DashboardService {
    private static final String NATS_URI = System.getenv("NATS_URI");
    private static final Optional<String> TARGET_DEVICE = Optional.ofNullable(System.getenv("TARGET_DEVICE"));

    private static final String INFLUXDB_URL = System.getenv("INFLUXDB_URL");
    private static final String INFLUXDB_TOKEN_FILE = System.getenv("INFLUXDB_TOKEN_FILE");
    private static final String INFLUXDB_ORG = System.getenv("INFLUXDB_ORG");
    private static final String INFLUXDB_BUCKET = System.getenv("INFLUXDB_BUCKET");
    private static final Logger logger = Logger.getLogger(DashboardService.class.getName());

    public static void main(String[] args) throws IOException, InterruptedException {
        logger.setLevel(Level.FINE);

        try {
            envVarEmptyMessage();
        } catch (Exception ex) {
            logger.log(Level.SEVERE, ex.getMessage());
            System.exit(1);
        }

        Options natsConnectionOptions = new Options.Builder()
                .server(NATS_URI)
                .connectionListener((connection, event) -> logger.info("Connection Event: " + event))
                .errorListener(new NatsErrorListener())
                .build();

        Connection natsConnection = Nats.connect(natsConnectionOptions);

        InfluxDBClientOptions influxDBClientOptions = InfluxDBClientOptions.builder()
                .connectionString(INFLUXDB_URL)
                .bucket(INFLUXDB_BUCKET)
                .org(INFLUXDB_ORG)
                .authenticateToken(Files.readString(Paths.get(INFLUXDB_TOKEN_FILE)).toCharArray())
                .build();

        InfluxDBClient influxDBClient = InfluxDBClientFactory.create(influxDBClientOptions);

        if (!influxDBClient.ping()) {
            logger.log(Level.SEVERE, "Couldn't connect to influxDB");
            System.exit(1);
        }

        logger.info("Successfully pinged InfluxDB service at " + INFLUXDB_URL);

        Dispatcher dispatcher = natsConnection.createDispatcher(msg -> {
            JSONObject messagePayload = new JSONObject(new String(msg.getData(), StandardCharsets.UTF_8));
            logger.info("From subject `" + msg.getSubject() + "`, received message " + messagePayload);

            try {
                Point point = createPointFromJson(messagePayload);
                influxDBClient.makeWriteApi().writePoint(point);
                logger.info("Successfully written data to InfluxDB");
            } catch (Exception e) {
                logger.log(Level.SEVERE, "Failed to write data to InfluxDB", e);
            }
        });

        String sensorStatisticsSubject = "sensor.statistics." + TARGET_DEVICE.orElse("*");
        dispatcher.subscribe(sensorStatisticsSubject);
    }

    private static void envVarEmptyMessage() throws IOException {
        if (NATS_URI == null)
            throw new IllegalArgumentException("NATS_URI environment variable is empty.");
        else
            logger.warning("NATS_URI=" + NATS_URI);

        if (INFLUXDB_URL == null)
            throw new IllegalArgumentException("INFLUXDB_URL environment variable is empty.");
        else
            logger.warning("INFLUXDB_URL=" + INFLUXDB_URL);

        if (INFLUXDB_TOKEN_FILE == null)
            throw new IllegalArgumentException(
                    "INFLUXDB_TOKEN_FILE environment variable is empty.");
        else
            logger.warning("INFLUXDB_TOKEN_FILE=" + INFLUXDB_TOKEN_FILE);

        Path tokenFilePath = Paths.get(INFLUXDB_TOKEN_FILE);

        if (Files.notExists(tokenFilePath))
            throw new IllegalArgumentException(
                    "There is no file on path `" + INFLUXDB_TOKEN_FILE + "`.");
        else if (Files.readString(tokenFilePath).isEmpty())
            throw new IllegalArgumentException(
                    "File on path `" + INFLUXDB_TOKEN_FILE + "` is empty.");
        else
            logger.warning("Token value: `" + Files.readString(tokenFilePath) + "`.");

        if (INFLUXDB_ORG == null)
            throw new IllegalArgumentException("INFLUXDB_ORG environment variable is empty.");
        else
            logger.warning("INFLUXDB_ORG=" + INFLUXDB_ORG);

        if (INFLUXDB_BUCKET == null)
            throw new IllegalArgumentException("INFLUXDB_BUCKET environment variable is empty");
        else
            logger.warning("INFLUXDB_BUCKET=" + INFLUXDB_BUCKET);
    }

    private static Point createPointFromJson(JSONObject json) {
        Point point = Point.measurement(json.getString("measurement"))
                .addTag("device", json.getString("device"))
                .addTag("type", json.getString("type"))
                .time(Instant.parse(json.getString("timestamp")), WritePrecision.NS);

        // Add fields
        if (json.get("lastValue") instanceof Number) {
            point.addField("lastValue", json.getDouble("lastValue"));
        } else if (json.get("lastValue") instanceof Boolean) {
            point.addField("lastValue", json.getBoolean("lastValue"));
        }

        JSONObject filtered = json.getJSONObject("filtered");
        if (filtered.has("deviationNominal")) {
            point.addField("deviationNominal", filtered.getDouble("deviationNominal"));
            point.addField("deviationPercent", filtered.getDouble("deviationPercent"));
            point.addField("runningAverage", filtered.getDouble("runningAverage"));
        } else if (filtered.has("truePercentage")) {
            point.addField("truePercentage", filtered.getDouble("truePercentage"));
        }

        return point;
    }
}
