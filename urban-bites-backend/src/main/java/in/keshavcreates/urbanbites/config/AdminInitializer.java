package in.keshavcreates.urbanbites.config;

import in.keshavcreates.urbanbites.entity.UserEntity;
import in.keshavcreates.urbanbites.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${admin.primary.email:}")
    private String primaryAdminEmail;

    @Value("${admin.primary.password:}")
    private String primaryAdminPassword;

    @Value("${admin.demo.email:}")
    private String demoAdminEmail;

    @Value("${admin.demo.password:}")
    private String demoAdminPassword;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Primary System Admin (Original Admin)
        if (primaryAdminEmail != null && !primaryAdminEmail.trim().isEmpty() && userRepository.findByEmail(primaryAdminEmail).isEmpty()) {
            UserEntity primaryAdmin = UserEntity.builder()
                    .name("Primary System Admin")
                    .email(primaryAdminEmail.trim())
                    .password(passwordEncoder.encode(primaryAdminPassword))
                    .build();
            userRepository.save(primaryAdmin);
            System.out.println(">>> Primary System Admin Initialized");
        }

        // 2. Seed Demo Admin (Recruiter Testing Admin)
        if (demoAdminEmail != null && !demoAdminEmail.trim().isEmpty() && userRepository.findByEmail(demoAdminEmail).isEmpty()) {
            UserEntity demoAdmin = UserEntity.builder()
                    .name("Demo System Admin")
                    .email(demoAdminEmail.trim())
                    .password(passwordEncoder.encode(demoAdminPassword))
                    .build();
            userRepository.save(demoAdmin);
            System.out.println(">>> Demo System Admin Initialized");
        }
    }
}
