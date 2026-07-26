package in.keshavcreates.urbanbites.config;

import in.keshavcreates.urbanbites.filters.JwtAuthenticationFilter;
import in.keshavcreates.urbanbites.filters.RequestWrapperFilter;
import in.keshavcreates.urbanbites.filters.UsernameValidationFilter;
import in.keshavcreates.urbanbites.service.AppUserDetailsService;
import in.keshavcreates.urbanbites.util.JwtUtil;
import jakarta.servlet.Filter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
        private final JwtUtil jwtUtil;

        @org.springframework.beans.factory.annotation.Value("${frontend.user.url:http://localhost:5174}")
        private String frontendUserUrl;

        @org.springframework.beans.factory.annotation.Value("${frontend.admin.url:http://localhost:5173}")
        private String frontendAdminUrl;

        private final AppUserDetailsService appUserDetailsService;

        public SecurityConfig(JwtUtil jwtUtil , AppUserDetailsService appUserDetailsService){
            this.jwtUtil = jwtUtil;
            this.appUserDetailsService=appUserDetailsService;
        }
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil, appUserDetailsService);
    }

    @Bean
    public UsernameValidationFilter usernameValidationFilter() {
        return new UsernameValidationFilter();
    }
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http ) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/login", "/api/register", "/api/forgot-password", "/api/reset-password").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/foods/getAll", "/api/foods/getFood/**", "/api/reviews/food/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/foods").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/foods/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/foods/deleteFood/**").hasRole("ADMIN")
                        .requestMatchers("/api/orders/all").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/orders/*/status").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }


    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public FilterRegistrationBean<Filter> requestWrapperFilter(){
            FilterRegistrationBean<Filter> registrationBean = new FilterRegistrationBean<>();
            registrationBean.setFilter(new RequestWrapperFilter());
            registrationBean.setOrder(Ordered.HIGHEST_PRECEDENCE);
            return registrationBean;
    }
    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        String userOrigin = frontendUserUrl != null ? frontendUserUrl.replaceAll("/+$", "") : "";
        String adminOrigin = frontendAdminUrl != null ? frontendAdminUrl.replaceAll("/+$", "") : "";
        java.util.List<String> allowedOrigins = new java.util.ArrayList<>(Arrays.asList(
                "http://localhost:[*]",
                "https://localhost:[*]",
                "http://127.0.0.1:[*]",
                "https://127.0.0.1:[*]"
        ));
        if (userOrigin != null && !userOrigin.isEmpty()) {
            allowedOrigins.add(userOrigin);
        }
        if (adminOrigin != null && !adminOrigin.isEmpty()) {
            allowedOrigins.add(adminOrigin);
        }
        configuration.setAllowedOriginPatterns(allowedOrigins);

        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));

        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));

        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider(appUserDetailsService);
        authenticationProvider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(authenticationProvider);
    }
}
