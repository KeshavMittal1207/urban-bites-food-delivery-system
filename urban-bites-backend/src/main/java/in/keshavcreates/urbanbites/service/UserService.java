package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.io.UserRequest;
import in.keshavcreates.urbanbites.io.UserResponse;

public interface UserService {

    UserResponse registerUser(UserRequest userRequest);

    String getUserId();

    String initiateForgotPassword(String email);

    void resetPassword(String token, String newPassword);

    java.util.Map<String, String> getSavedAddresses();

    java.util.Map<String, String> saveAddress(String type, String address);

    java.util.Map<String, String> deleteAddress(String type);
}
