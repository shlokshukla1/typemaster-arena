package com.typemaster.arena.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Injects the logged-in {@link com.typemaster.arena.entity.User} into a controller method parameter,
 * resolved from the "Authorization: Bearer &lt;token&gt;" header.
 * With required = true (default) a missing/invalid token results in HTTP 401.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
    boolean required() default true;
}
