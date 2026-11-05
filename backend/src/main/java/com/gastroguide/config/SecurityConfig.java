package com.gastroguide.config;

import com.gastroguide.auth.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        // Sinal de vida para o healthcheck do container e para o
                        // balanceador — não toca o banco nem revela versão.
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        // Único caminho público do sistema — autorização é o token no
                        // path (opaco, hasheado no banco), não a sessão de médico/secretária.
                        .requestMatchers("/api/intake/**").permitAll()
                        .requestMatchers("/api/pacientes/*/cabecalhos/**").hasAuthority("ROLE_DOCTOR")
                        .requestMatchers("/api/pacientes/*/prontuario/**").hasAuthority("ROLE_DOCTOR")
                        // Atestado e relatório podem levar CID e dado clínico (14/10/2026).
                        .requestMatchers("/api/pacientes/*/documentos/**").hasAuthority("ROLE_DOCTOR")
                        .requestMatchers("/api/doencas/**").hasAuthority("ROLE_DOCTOR")
                        .requestMatchers("/api/prontuario/**").hasAuthority("ROLE_DOCTOR")
                        .requestMatchers("/api/medicos/**").hasAuthority("ROLE_DOCTOR")
                        // Excluir um paciente apaga o prontuário inteiro em cascata
                        // (ON DELETE CASCADE) — a secretária pode gerenciar pacientes,
                        // mas não pode destruir o dado clínico que ela nem enxerga.
                        .requestMatchers(HttpMethod.DELETE, "/api/pacientes/*").hasAuthority("ROLE_DOCTOR")
                        .anyRequest().authenticated())
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint((request, response, ex) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"message\":\"Não autenticado.\"}");
                        })
                        .accessDeniedHandler((request, response, ex) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"message\":\"Acesso restrito a médicos.\"}");
                        }))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
