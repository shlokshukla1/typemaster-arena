package com.typemaster.arena.config;

import com.typemaster.arena.entity.User;
import com.typemaster.arena.exception.UnauthorizedException;
import com.typemaster.arena.service.AuthService;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.Optional;

/** Resolves parameters annotated with {@link CurrentUser} from the bearer token. */
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private final AuthService authService;

    public CurrentUserArgumentResolver(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class) && parameter.getParameterType() == User.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
                                  NativeWebRequest request, WebDataBinderFactory binderFactory) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = (header != null && header.startsWith("Bearer ")) ? header.substring(7).trim() : null;
        Optional<User> user = authService.findByToken(token);

        CurrentUser ann = parameter.getParameterAnnotation(CurrentUser.class);
        if (user.isEmpty() && ann != null && ann.required()) {
            throw new UnauthorizedException("Please log in to use this feature");
        }
        return user.orElse(null);
    }
}
