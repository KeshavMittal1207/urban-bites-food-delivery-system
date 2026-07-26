package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.entity.UserEntity;
import in.keshavcreates.urbanbites.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AppUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Value("${admin.primary.email:}")
    private String primaryAdminEmail;

    @Value("${admin.demo.email:}")
    private String demoAdminEmail;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserEntity userEntity = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found"));
        
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        if ((primaryAdminEmail != null && !primaryAdminEmail.isEmpty() && primaryAdminEmail.equalsIgnoreCase(email)) ||
            (demoAdminEmail != null && !demoAdminEmail.isEmpty() && demoAdminEmail.equalsIgnoreCase(email))) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        } else {
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        }
        
        return new User(userEntity.getEmail(), userEntity.getPassword(), authorities);
    }
}
