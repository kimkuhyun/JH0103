FROM gradle:8.14-jdk17 AS builder
WORKDIR /app
COPY . .
RUN gradle build -x test --no-daemon


FROM builder AS test
RUN gradle test --no-daemon


FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=builder /app/build/libs/app.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]