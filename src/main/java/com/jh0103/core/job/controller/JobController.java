package com.jh0103.core.job.controller;

import com.jh0103.core.job.domain.Job;
import com.jh0103.core.job.dto.UpdateJobStatusRequest;
import com.jh0103.core.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<List<Job>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Job> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    @PostMapping
    public ResponseEntity<Job> createJob(@RequestBody Job job) {
        return ResponseEntity.ok(jobService.createJob(job));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.ok().build();
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
