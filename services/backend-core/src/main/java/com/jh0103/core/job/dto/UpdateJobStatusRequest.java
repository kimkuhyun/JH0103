package com.jh0103.core.job.dto;

import com.jh0103.core.job.domain.JobStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateJobStatusRequest {
    private JobStatus status;
}
