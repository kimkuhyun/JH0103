package com.jh0103.core.job.controller;

import com.jh0103.core.job.domain.Job;
import com.jh0103.core.job.service.JobService;
import com.jh0103.core.job.dto.UpdateJobStatusRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/jobs") // 공통 URL 프리픽스
public class JobController {

    private final JobService jobService;

    // 1. [파이썬용] 분석 결과 저장 API (POST /api/v1/jobs)
    @PostMapping
    public ResponseEntity<Long> saveJob(@RequestBody Map<String, Object> requestData) {
        Long savedId = jobService.saveJobFromAi(requestData);
        return ResponseEntity.ok(savedId);
    }

    // 2. [리액트용] 공고 목록 조회 API (GET /api/v1/jobs)
    @GetMapping
    public ResponseEntity<List<Job>> getJobs() {
        List<Job> jobs = jobService.getAllJobs();
        return ResponseEntity.ok(jobs);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{jobId}/status")
    public ResponseEntity<Void> updateJobStatus(
        @PathVariable Long jobId,
        @RequestBody UpdateJobStatusRequest request
    ) {
        jobService.updateJobStatus(jobId, request.getStatus());
        return ResponseEntity.ok().build();
    }
}
