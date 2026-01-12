package com.jh0103.core.user.service;

import com.jh0103.core.user.domain.User;
import com.jh0103.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
@Service
public class UserService{
    private final UserRepository userRepository;

    @Transactional(readOnly = true){
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id=" + userId));
    }
}