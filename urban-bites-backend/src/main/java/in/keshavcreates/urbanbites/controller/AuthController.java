package in.keshavcreates.urbanbites.controller;

import in.keshavcreates.urbanbites.io.AuthenticationRequest;
import in.keshavcreates.urbanbites.io.AuthenticationResponse;
import in.keshavcreates.urbanbites.service.AppUserDetailsService;
import in.keshavcreates.urbanbites.util.JwtUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private AppUserDetailsService appUserDetailsService;
    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public AuthenticationResponse login(@RequestBody AuthenticationRequest authenticationRequest){
        System.out.println("LOGIN CONTROLLER HIT");
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(authenticationRequest.getEmail() , authenticationRequest.getPassword()));
        final UserDetails userDetails = appUserDetailsService.loadUserByUsername(authenticationRequest.getEmail());
        final String jwtToken = jwtUtil.generateToken(userDetails);
        return new AuthenticationResponse(authenticationRequest.getEmail(), jwtToken);
    }
}
