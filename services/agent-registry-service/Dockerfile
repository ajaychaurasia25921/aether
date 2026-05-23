FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml ./pom.xml
COPY services/agent-registry-service/pom.xml ./services/agent-registry-service/pom.xml
COPY services/agent-registry-service/src ./services/agent-registry-service/src

RUN mvn -pl services/agent-registry-service -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /work

COPY --from=build /workspace/services/agent-registry-service/target/quarkus-app/lib/ ./lib/
COPY --from=build /workspace/services/agent-registry-service/target/quarkus-app/*.jar ./
COPY --from=build /workspace/services/agent-registry-service/target/quarkus-app/app/ ./app/
COPY --from=build /workspace/services/agent-registry-service/target/quarkus-app/quarkus/ ./quarkus/

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
