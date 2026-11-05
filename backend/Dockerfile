FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Unprivileged user: nothing here needs root.
RUN addgroup -g 1001 -S spring && adduser -S spring -u 1001
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar
USER spring

EXPOSE 8080

# Container-aware JVM. Without these flags, the JVM defaults to 25% of the
# container memory for heap, which wastes memory in a large container and is
# tight in a small one. 70% leaves room for metaspace, thread stacks and
# direct buffers.
#
# ExitOnOutOfMemoryError: if the heap runs out, the process dies and Docker
# restarts it, which beats staying alive and failing every request.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
