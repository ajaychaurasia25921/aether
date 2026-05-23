FROM gradle:8.12.1-jdk21 AS build
WORKDIR /workspace

COPY settings.gradle build.gradle ./
COPY services/agent-registry-service/build.gradle ./services/agent-registry-service/build.gradle
COPY services/agent-registry-service/src ./services/agent-registry-service/src

RUN gradle :services:agent-registry-service:quarkusBuild --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /work

COPY --from=build /workspace/services/agent-registry-service/build/quarkus-app/lib/ ./lib/
COPY --from=build /workspace/services/agent-registry-service/build/quarkus-app/*.jar ./
COPY --from=build /workspace/services/agent-registry-service/build/quarkus-app/app/ ./app/
COPY --from=build /workspace/services/agent-registry-service/build/quarkus-app/quarkus/ ./quarkus/

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
