package com.jh0103.core.company.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jh0103.core.company.domain.Company;
import com.jh0103.core.company.dto.CompanyResearchRequest;
import com.jh0103.core.company.dto.CompanyResearchResponse;
import com.jh0103.core.company.repository.CompanyRepository;
import com.jh0103.core.job.domain.Job;
import com.jh0103.core.job.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {
    
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Value("${mcp.server.url:http://company-search-server:4000}")
    private String mcpServerUrl;
    
    /**
     * Job ID로 회사 조사 수행
     * 
     * @param jobId Job ID
     * @return 조사 결과
     */
    @Transactional
    public Company researchCompanyByJobId(Long jobId) {
        // 1. Job 조회
        Job job = jobRepository.findById(jobId)
            .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        
        // 2. 이미 조사된 경우 기존 결과 반환
        if (companyRepository.existsByJob(job)) {
            log.info("Company research already exists for job: {}", jobId);
            return companyRepository.findByJob(job).orElseThrow();
        }
        
        // 3. Job 정보에서 회사 조사 요청 생성
        CompanyResearchRequest request = buildResearchRequest(job);
        
        // 4. MCP 서버 호출
        CompanyResearchResponse response = callMcpServer(request);
        
        // 5. 결과를 Company 엔티티로 변환 및 저장
        Company company = saveCompanyResearch(job, response);
        
        log.info("Company research completed for job: {}", jobId);
        return company;
    }
    
    /**
     * Job 정보로부터 회사 조사 요청 생성
     */
    private CompanyResearchRequest buildResearchRequest(Job job) {
        return CompanyResearchRequest.builder()
            .companyName(job.getCompanyName())
            .jobtitle(job.getRoleName())
            .jobDescription(extractJobDescription(job.getJobDetailJson()))
            .companyUrl(job.getOriginalUrl())
            .build();
    }
    
    /**
     * jobDetailJson에서 직무 설명 추출
     */
    private String extractJobDescription(String jobDetailJson) {
        if (jobDetailJson == null || jobDetailJson.isEmpty()) {
            return "";
        }
        
        try {
            // JSON 파싱해서 description 필드 추출
            var jsonNode = objectMapper.readTree(jobDetailJson);
            if (jsonNode.has("description")) {
                return jsonNode.get("description").asText();
            }
            // 전체 JSON을 description으로 사용
            return jobDetailJson.substring(0, Math.min(jobDetailJson.length(), 1000));
        } catch (Exception e) {
            log.warn("Failed to parse job detail JSON", e);
            return "";
        }
    }
    
    /**
     * MCP 서버 호출
     */
    private CompanyResearchResponse callMcpServer(CompanyResearchRequest request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<CompanyResearchRequest> entity = new HttpEntity<>(request, headers);
            
            log.info("Calling MCP server: {} with company: {}", 
                mcpServerUrl + "/search", request.getCompanyName());
            
            CompanyResearchResponse response = restTemplate.postForObject(
                mcpServerUrl + "/search",
                entity,
                CompanyResearchResponse.class
            );
            
            if (response == null || !Boolean.TRUE.equals(response.getSuccess())) {
                throw new RuntimeException("MCP server returned error: " + 
                    (response != null ? response.getError() : "null response"));
            }
            
            return response;
            
        } catch (Exception e) {
            log.error("Failed to call MCP server", e);
            throw new RuntimeException("Company research failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * 조사 결과를 Company 엔티티로 저장
     */
    private Company saveCompanyResearch(Job job, CompanyResearchResponse response) {
        try {
            // 응답 데이터를 JSON으로 직렬화
            String companySearchResult = objectMapper.writeValueAsString(response.getData());
            
            Company company = Company.builder()
                .job(job)
                .companySearchResult(companySearchResult)
                .build();
            
            return companyRepository.save(company);
            
        } catch (Exception e) {
            log.error("Failed to save company research", e);
            throw new RuntimeException("Failed to save company research", e);
        }
    }
    
    /**
     * Job ID로 회사 조사 결과 조회
     */
    @Transactional(readOnly = true)
    public Company getCompanyResearchByJobId(Long jobId) {
        Job job = jobRepository.findById(jobId)
            .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        
        return companyRepository.findByJob(job)
            .orElse(null);
    }
}
