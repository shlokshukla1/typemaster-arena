package com.typemaster.arena;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point of TypeMaster Arena.
 * Starts the embedded Tomcat server which serves both the REST API (/api/**)
 * and the single-page frontend (templates/index.html + static assets).
 */
@SpringBootApplication
public class TypeMasterArenaApplication {

    public static void main(String[] args) {
        SpringApplication.run(TypeMasterArenaApplication.class, args);
    }
}
