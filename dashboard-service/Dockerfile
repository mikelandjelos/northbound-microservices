# Maven
FROM maven:3.8.1-openjdk-11-slim AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn -e -B dependency:resolve
COPY src ./src
RUN mvn clean -e -B package

#
# Package stage
#
FROM openjdk:11-jre-slim-buster
WORKDIR /app
COPY --from=builder /app/target/dashboard-service-1.0-SNAPSHOT-jar-with-dependencies.jar .
ENTRYPOINT ["java", "-jar", "dashboard-service-1.0-SNAPSHOT-jar-with-dependencies.jar"]