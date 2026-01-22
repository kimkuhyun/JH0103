package com.jh0103.core.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * MCP 서버로부터 받은 회사 조사 결과 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResearchResponse {
    
    private Boolean success;
    private CompanyData data;
    private String error;
    
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyData {
        private String company_name;
        private String industry;
        private String business_summary;
        private List<String> key_products;
        private String company_culture;
        private String recent_news_summary;
        private String job_fit_analysis;
        private String raw_analysis;
    }
}
