package com.jh0103.core.company.domain;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import com.jh0103.core.job.domain.Job;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "company")
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long companyID;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false, unique = true)
    private Job job;

    @Column(name = "company_search_result", columnDefinition = "json")
    private String companySearchResult;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    @Builder
    public Company(Job job, String companySearchResult) {
        this.job = job;
        this.companySearchResult = companySearchResult;
    }

}