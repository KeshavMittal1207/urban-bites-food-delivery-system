package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.entity.UserEntity;
import in.keshavcreates.urbanbites.exception.DuplicateResourceException;
import in.keshavcreates.urbanbites.exception.ResourceNotFoundException;
import in.keshavcreates.urbanbites.io.UserRequest;
import in.keshavcreates.urbanbites.io.UserResponse;
import in.keshavcreates.urbanbites.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService{
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationFacade authenticationFacade;

    @Override
    public UserResponse registerUser(UserRequest userRequest) {
        userRepository.findByEmail(userRequest.getEmail()).ifPresent(existing -> {
            throw new DuplicateResourceException("User already exists with email: " + userRequest.getEmail());
        });
        UserEntity userEntity = convertToEntity(userRequest);
        userRepository.save(userEntity);
        return convertToResponse(userEntity);
    }

    @Override
    public String getUserId() {
        String loggedInUserEmail = authenticationFacade.getAuthentication().getName();
        UserEntity loggedInUser = userRepository.findByEmail(loggedInUserEmail).orElseThrow(() -> new UsernameNotFoundException("User Not Found"));
        return loggedInUser.getId();
    }

    @Override
    public String initiateForgotPassword(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user found with email: " + email));
        
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        
        System.out.println("Password reset token generated for " + email + ": " + token);
        return token;
    }

    @Override
    public void resetPassword(String token, String newPassword) {
        UserEntity user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid password reset token"));
        
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Reset token has expired");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    @Override
    public java.util.Map<String, String> getSavedAddresses() {
        String userId = getUserId();
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getSavedAddresses();
    }

    @Override
    public java.util.Map<String, String> saveAddress(String type, String address) {
        String userId = getUserId();
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.getSavedAddresses().put(type, address);
        userRepository.save(user);
        return user.getSavedAddresses();
    }

    @Override
    public java.util.Map<String, String> deleteAddress(String type) {
        String userId = getUserId();
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.getSavedAddresses().remove(type);
        userRepository.save(user);
        return user.getSavedAddresses();
    }

    public UserEntity convertToEntity(UserRequest userRequest){
        UserEntity userEntity = UserEntity.builder().name(userRequest.getName())
                .email(userRequest.getEmail())
                .password(passwordEncoder.encode(userRequest.getPassword()))
                .build();
        return userEntity;
    }

    public UserResponse convertToResponse(UserEntity userEntity) {
        UserResponse userResponse = UserResponse.builder()
                .name(userEntity.getName())
                .email(userEntity.getEmail())
                .id(userEntity.getId())
                .build();
        return userResponse;
    }

}
