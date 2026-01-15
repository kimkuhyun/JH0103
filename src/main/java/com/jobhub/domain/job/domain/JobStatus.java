package com.jobhub.domain.job.domain;

public enum JobStatus {
    INBOX("받은편지함"),
    APPLIED("지원 완료"),
    ARCHIVED("보관됨");

    private final String description;

    JobStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
