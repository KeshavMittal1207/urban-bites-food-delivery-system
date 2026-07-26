package in.keshavcreates.urbanbites.controller;

import in.keshavcreates.urbanbites.io.UserRequest;
import in.keshavcreates.urbanbites.io.UserResponse;
import in.keshavcreates.urbanbites.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse registerUser(@Valid @RequestBody UserRequest userRequest){
        return userService.registerUser(userRequest);
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = userService.initiateForgotPassword(email);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset token generated. For testing/demo, token is returned here and also printed to backend console.");
        response.put("token", token);
        return response;
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        userService.resetPassword(token, newPassword);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password has been reset successfully. Please sign in with your new password.");
        return response;
    }

    @GetMapping("/addresses")
    public Map<String, String> getAddresses() {
        return userService.getSavedAddresses();
    }

    @PostMapping("/addresses")
    public Map<String, String> saveAddress(@RequestBody Map<String, String> request) {
        String type = request.get("type");
        String address = request.get("address");
        return userService.saveAddress(type, address);
    }

    @DeleteMapping("/addresses/{type}")
    public Map<String, String> deleteAddress(@PathVariable("type") String type) {
        return userService.deleteAddress(type);
    }
}
