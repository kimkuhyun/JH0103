package com.jh0103.core.job.domain;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "role_name", nullable = false)
    private String roleName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(name = "original_url", length = 2083)
    private String originalUrl;

    @Column(name = "job_detail_json", columnDefinition = "json")
    private String jobDetailJson;
    
    @Lob 
    @Column(name = "screenshot", columnDefinition = "LONGTEXT")
    private String screenshot;

    @Column(name = "created_at")
    private LocalDateTime createdAt;


    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    @Builder
    // 생성자에도 screenshot 파라미터 추가
    public Job(Long userId, String companyName, String roleName, JobStatus status, 
               String originalUrl, String jobDetailJson, String screenshot) {
        this.userId = userId;
        this.companyName = companyName;
        this.roleName = roleName;
        this.status = status;
        this.originalUrl = originalUrl;
        this.jobDetailJson = jobDetailJson;
        this.screenshot = screenshot; 
    }
    
    public void updateStatus(JobStatus status) {
        this.status = status;
    }
}