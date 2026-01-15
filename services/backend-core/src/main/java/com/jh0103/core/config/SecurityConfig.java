package com.jh0103.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configure(http))
            .authorizeHttpRequests(auth -> auth
                // AI 서버에서 POST 요청 허용 (인증 불필요)
                .requestMatchers(HttpMethod.POST, "/api/v1/jobs").permitAll()
                // 나머지 Jobs API는 인증 필요
                .requestMatchers("/api/v1/jobs/**").authenticated()
                // OAuth, Auth, User 관련은 모두 허용
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/user").permitAll()
                // 그 외 모두 허용
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
