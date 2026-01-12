package com.jh0103.core.job.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper; 
import com.jh0103.core.job.domain.Job;
import com.jh0103.core.job.repository.JobRepository;
import com.jh0103.core.user.domain.User;
import com.jh0103.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; 
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Long saveJobFromAi(Map<String, Object> requestData) {
        // 1. 데이터 추출 
        Map<String, Object> summary = (Map<String, Object>) requestData.get("job_summary");
        String originalUrl = (String) requestData.get("url");
        String imageBase64 = (String) requestData.get("image_base64"); 

        String userEmail = (String) requestData.get("user_email");
        Long userId = 1L; // 기본값 (Fallback)

        if (userEmail != null && !userEmail.isEmpty()) {
            Optional<User> user = userRepository.findByEmail(userEmail);
            if (user.isPresent()) {
                userId = user.get().getId();
            } else {
                System.out.println("⚠️ 해당 이메일의 유저를 찾을 수 없음: " + userEmail);
                // 필요시 여기서 새 유저 생성
            }
        }

        String jsonString = "{}";
        try {
            jsonString = objectMapper.writeValueAsString(summary);
        } catch (JsonProcessingException e) {
            log.error("JSON 변환 실패", e);
        }

        // 2. 엔티티 생성
        Job job = Job.builder()
                .userId(userId) // 임시: 1번 유저 (나중에 로그인 연동 시 변경)
                .companyName((String) summary.getOrDefault("company_name", "Unknown Company"))
                .roleName((String) summary.getOrDefault("title", "Untitled Role"))
                .status("INBOX")
                .originalUrl(originalUrl)
                .jobDetailJson(jsonString)// 전체 JSON 백업
                .screenshot(imageBase64) // 📸 스크린샷 저장
                .build();

        // 3. DB 저장
        return jobRepository.save(job).getId();
    }

    // [조회] 리액트 UI에 뿌려줄 공고 목록 조회
    @Transactional(readOnly = true)
    public List<Job> getAllJobs() {
        return jobRepository.findAllByOrderByCreatedAtDesc();
    }
}