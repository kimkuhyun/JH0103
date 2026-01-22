package com.jh0103.core.company.controller;

import com.jh0103.core.company.domain.Company;
import com.jh0103.core.company.service.CompanyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {
    
    private final CompanyService companyService;
    
    /**
     * 회사 조사 시작
     * 
     * POST /api/company/research?jobId=123
     * 
     * @param jobId Job ID
     * @return 조사 결과
     */
    @PostMapping("/research")
    public ResponseEntity<Map<String, Object>> researchCompany(@RequestParam Long jobId) {
        try {
            log.info("Starting company research for job: {}", jobId);
            
            Company company = companyService.researchCompanyByJobId(jobId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Company research completed");
            response.put("data", Map.of(
                "companyId", company.getCompanyID(),
                "jobId", jobId,
                "companySearchResult", company.getCompanySearchResult(),
                "createdAt", company.getCreatedAt()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.error("Invalid job ID: {}", jobId, e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
            
        } catch (Exception e) {
            log.error("Failed to research company for job: {}", jobId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Company research failed: " + e.getMessage()
            ));
        }
    }
    
    /**
     * 회사 조사 결과 조회
     * 
     * GET /api/company/research?jobId=123
     * 
     * @param jobId Job ID
     * @return 조사 결과
     */
    @GetMapping("/research")
    public ResponseEntity<Map<String, Object>> getCompanyResearch(@RequestParam Long jobId) {
        try {
            Company company = companyService.getCompanyResearchByJobId(jobId);
            
            if (company == null) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "exists", false,
                    "message", "No company research found for this job"
                ));
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "exists", true,
                "data", Map.of(
                    "companyId", company.getCompanyID(),
                    "jobId", jobId,
                    "companySearchResult", company.getCompanySearchResult(),
                    "createdAt", company.getCreatedAt()
                )
            ));
            
        } catch (Exception e) {
            log.error("Failed to get company research for job: {}", jobId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}
