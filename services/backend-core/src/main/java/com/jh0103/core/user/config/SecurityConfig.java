package com.jh0103.core.user.config;

import com.jh0103.core.user.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;

import java.util.Arrays;

@RequiredArgsConstructor
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/v1/jobs/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/jobs/**").permitAll()
                .requestMatchers(HttpMethod.PATCH, "/api/v1/jobs/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/jobs/**").permitAll()
                .requestMatchers("/", "/css/**", "/images/**", "/js/**", "/h2-console/**", "/login/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("http://localhost:5173", true)
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
            )
            .logout(logout -> logout
                .logoutUrl("/api/v1/auth/logout") 
                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(HttpStatus.OK.value()); 
                })
                .deleteCookies("JSESSIONID") 
                .invalidateHttpSession(true) 
                .clearAuthentication(true)
                .permitAll()
            );

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173")); 
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true); 

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}