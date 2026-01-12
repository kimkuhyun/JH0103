package com.jh0103.core.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser; 
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc 
class AuthServiceApplicationTests {

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("로그인 안 한 사람은 접속 막히는지 테스트")
    void login_fail_test() throws Exception {
        mvc.perform(get("/private")) // 메인 페이지 접속 시도
           .andExpect(status().is3xxRedirection()); // 302 리다이렉트 (로그인 페이지로 쫓겨남)
    }

    @Test
    @DisplayName("가짜로 로그인한 사람은 접속 되는지 테스트")
    @WithMockUser(roles = "USER") 
    void login_success_test() throws Exception {
        // 원래는 "/" 접속하면 로그인 안되어있어서 튕기지만, 
        // @WithMockUser 덕분에 통과해야 함 (현재 설정상 404가 뜨더라도 인증은 통과한 것)
        mvc.perform(get("/private")) 
           .andExpect(status().isNotFound()); // "/" 페이지를 안 만들었으므로 404가 뜨는게 정상 (인증 실패인 401/403이 아니면 됨)
    }
}