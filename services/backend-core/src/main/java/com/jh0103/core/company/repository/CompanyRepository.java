package com.jh0103.core.company.repository;

import com.jh0103.core.company.domain.Company;
import com.jh0103.core.job.domain.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    
    /**
     * Job ID로 회사 정보 조회
     */
    Optional<Company> findByJob(Job job);
    
    /**
     * Job ID로 회사 정보 존재 여부 확인
     */
    boolean existsByJob(Job job);
}
