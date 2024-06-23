package com.dashboard;

import io.nats.client.Connection;
import io.nats.client.Consumer;
import io.nats.client.ErrorListener;
import java.util.logging.Level;
import java.util.logging.Logger;

public class NatsErrorListener implements ErrorListener {
    private static final Logger logger = Logger.getLogger(NatsErrorListener.class.getName());

    @Override
    public void errorOccurred(Connection conn, String error) {
        logger.log(Level.SEVERE, "Error occurred: " + error);
    }

    @Override
    public void exceptionOccurred(Connection conn, Exception exp) {
        logger.log(Level.SEVERE, "Exception occurred: " + exp.getMessage(), exp);
    }

    @Override
    public void slowConsumerDetected(Connection conn, Consumer consumer) {
        logger.log(Level.WARNING, "Slow consumer detected: " + consumer);
    }
}
