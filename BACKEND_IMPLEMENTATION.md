# 백엔드 구현 가이드

## JobStatus 상태 변경 API

프론트엔드에서 상태 변경 드롭다운이 작동하려면 다음 API를 구현해야 합니다.

### 1. Controller (JobController.java)

```java
@PatchMapping("/{jobId}/status")
public ResponseEntity<Void> updateJobStatus(
    @PathVariable Long jobId,
    @RequestBody UpdateJobStatusRequest request
) {
    jobService.updateJobStatus(jobId, request.getStatus());
    return ResponseEntity.ok().build();
}
```

### 2. Service (JobService.java)

```java
@Transactional
public void updateJobStatus(Long jobId, JobStatus status) {
    Job job = jobRepository.findById(jobId)
        .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
    job.updateStatus(status);
    jobRepository.save(job);
}
```

### 3. Entity (Job.java)

```java
public void updateStatus(JobStatus status) {
    this.status = status;
}
```

### 4. DTO

이미 생성되어 있습니다:
- `UpdateJobStatusRequest.java` ✅

### 5. Enum

이미 생성되어 있습니다:
- `JobStatus.java` (INBOX, APPLIED, ARCHIVED) ✅

---

## 구현 확인

1. 프론트엔드에서 상세 패널 상단의 상태 드롭다운을 변경
2. `PATCH /api/v1/jobs/{id}/status` 호출
3. DB에 상태가 업데이트되는지 확인
4. 새로고침 후에도 변경된 상태가 유지되는지 확인
