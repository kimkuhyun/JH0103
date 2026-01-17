package com.jh0103.core.job.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper; 
import com.jh0103.core.job.domain.Job;
import com.jh0103.core.job.domain.JobStatus;
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
        Map<String, Object> fullData = (Map<String, Object>) requestData.get("job_summary");
        String originalUrl = (String) requestData.get("url");
        String imageBase64 = (String) requestData.get("image_base64"); 
        String userEmail = (String) requestData.get("user_email");

        String companyName = "Unknown Company";
        String roleName = "Untitled Role";

        if (fullData != null) {
            // 회사명 추출: company_info -> name
            Map<String, Object> companyInfo = (Map<String, Object>) fullData.get("company_info");
            if (companyInfo != null) {
                String rawName = (String) companyInfo.getOrDefault("name", companyName);
                companyName = rawName
                    .replaceAll("^(주)?\\s*\\(주\\)", "")  // 주(주), (주) 제거
                    .replaceAll("^주\\)", "")               // 주) 제거
                    .replaceAll("^㈜", "")                  // ㈜ 제거
                    .replaceAll("^주식회사\\s*", "")       // 주식회사 제거
                    .trim();
            }

            // 공고명 추출: job_summary -> title
            Map<String, Object> jobSummary = (Map<String, Object>) fullData.get("job_summary");
            if (jobSummary != null) {
                roleName = (String) jobSummary.getOrDefault("title", roleName);
            }
        }

        Long userId = 1L;
        if (userEmail != null && !userEmail.isEmpty()) {
            Optional<User> user = userRepository.findByEmail(userEmail);
            if (user.isPresent()) {
                userId = user.get().getId();
            } else {
                log.warn("⚠️ 유저 찾기 실패: {}", userEmail);
            }
        }

        // 4. JSON 문자열 변환
        String jsonString = "{}";
        try {
            jsonString = objectMapper.writeValueAsString(fullData);
        } catch (JsonProcessingException e) {
            log.error("JSON 변환 실패", e);
        }

        // 2. 엔티티 생성
        Job job = Job.builder()
                .userId(userId)
                .companyName(companyName) 
                .roleName(roleName)
                .status(JobStatus.PENDING)
                .originalUrl(originalUrl)
                .jobDetailJson(jsonString)
                .screenshot(imageBase64)
                .build();

        // 3. DB 저장
        return jobRepository.save(job).getId();
    }

    // [조회] 리액트 UI에 뿌려줄 공고 목록 조회
    @Transactional(readOnly = true)
    public List<Job> getAllJobs() {
        return jobRepository.findAllByOrderByCreatedAtDesc();
    }
    
    @Transactional
    public void deleteJob(Long jobId) {
        jobRepository.deleteById(jobId);
    }

    @Transactional
    public void updateJobStatus(Long jobId, JobStatus status) {
        Job job = jobRepository.findById(jobId)
            .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        job.updateStatus(status);
        jobRepository.save(job);
    }
}
