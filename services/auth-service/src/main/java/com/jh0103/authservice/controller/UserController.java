package com.jh103.authservice.controller;

importcom.jh103.authservice.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
public class UserControoler{
    
    private final HttpSession httpSession;

    @GetMapping("/apt/v1/user")
    public ResponseEntity<SessionUser> getUser(){
        SessionUser user = (SessionUser) httpSession.getAttribute('user');

        if(user != null){
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(401).build();
    }
}