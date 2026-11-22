# ---- build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Download libraries through Google's Maven Central mirror (repo.maven.apache.org answers
# "429 Too Many Requests" to shared hosting IPs) and retry if a download fails.
ENV MAVEN_OPTS="-Daether.connector.http.retryHandler.count=5"
COPY maven-settings.xml /root/.m2/settings.xml
COPY pom.xml .
RUN mvn -q -B dependency:go-offline || (sleep 15 && mvn -q -B dependency:go-offline)
COPY src ./src
RUN mvn -q -B -DskipTests package || (sleep 15 && mvn -B -DskipTests package)

# ---- run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/typemaster-arena-1.0.0.jar app.jar
ENV THYMELEAF_CACHE=true
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Xmx384m -jar app.jar"]
