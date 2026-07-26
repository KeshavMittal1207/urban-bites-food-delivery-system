package in.keshavcreates.urbanbites.filters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

public class UsernameValidationFilter extends OncePerRequestFilter {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (request.getServletPath().equals("/api/register") && request.getMethod().equalsIgnoreCase("POST")) {
            CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);

            try {
                String body = new String(wrappedRequest.getCachedBody(), StandardCharsets.UTF_8);
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(body);
                
                if (node == null || !node.has("email")) {
                    sendErrorResponse(response, "Email is required");
                    return;
                }
                
                String username = node.get("email").asText();

                if (username != null && EMAIL_PATTERN.matcher(username.trim()).matches()) {
                    filterChain.doFilter(wrappedRequest, response);
                } else {
                    sendErrorResponse(response, "Invalid email format. Please provide a valid email address.");
                }
            } catch (Exception e) {
                sendErrorResponse(response, "Malformed request body");
            }
        } else {
            filterChain.doFilter(request, response);
        }
    }

    private void sendErrorResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        
        String jsonError = String.format("{\"status\":400,\"error\":\"Validation failed\",\"details\":{\"email\":\"%s\"}}", message);
        response.getWriter().write(jsonError);
    }
}
