package com.jh0103.core.job.domain;

public enum JobStatus {
    PENDING("대기중"),
    DRAFT("작성중"),
    APPLIED("지원 완료"),
    CLOSED("종료됨");

    private final String description;

    JobStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
