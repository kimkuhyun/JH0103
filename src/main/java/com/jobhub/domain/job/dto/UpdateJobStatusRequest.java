package com.jobhub.domain.job.dto;

import com.jobhub.domain.job.domain.JobStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateJobStatusRequest {
    private JobStatus status;
}
