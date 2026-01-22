package com.jh0103.core.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * MCP 서버로 보낼 회사 조사 요청 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResearchRequest {
    
    /**
     * 회사명 (필수)
     */
    private String companyName;
    
    /**
     * 직무 제목
     */
    private String jobtitle;
    
    /**
     * 직무 설명
     */
    private String jobDescription;
    
    /**
     * 회사 URL (선택)
     */
    private String companyUrl;
}
