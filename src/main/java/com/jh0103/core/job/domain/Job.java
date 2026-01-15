package com.jh0103.core.job.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "jobs")
@Getter
@Setter
@NoArgsConstructor
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String companyName;

    @Column(nullable = false)
    private String roleName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status = JobStatus.INBOX;

    @Column(nullable = false, length = 1000)
    private String originalUrl;

    @Column(columnDefinition = "TEXT")
    private String jobDetailJson;

    @Column(columnDefinition = "LONGTEXT")
    private String screenshot;

    @Column(nullable = false)
    private String createdAt;

    public void updateStatus(JobStatus status) {
        this.status = status;
    }
}
