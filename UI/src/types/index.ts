export type JobStatus = 'INBOX' | 'WRITING' | 'APPLIED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';

export interface Job{
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  deadline: string;
  location: string;
  commuteTime: string;
  tags: string[];
  lat: number;
  lng: number;
  detail?: JobDetail;
  rawJson?: any; // 원본 JSON 데이터 보관
}

export interface JobDetail {
  responsibilities: string[];
  qualifications: string[];
  preferred: string[];
  techStack: string[];
  salary: string;
  originalUrl: string;
  workHours: string;
}

export interface BackendJob {
  id: number;
  companyName: string;
  roleName: string;
  status: string;
  originalUrl: string;
  jobDetailJson: string;
  screenshot?: string;
  createdAt: string;
}

// 새로운 JSON 구조 (v2.0)
export interface JobJsonV2 {
  meta?: {
    url?: string;
    captured_at?: string;
    industry_domain?: string;
    source_platform?: string;
  };
  company_info?: {
    name?: string;
    description?: string;
    employee_count?: string;
    business_type?: string;
    established?: string;
    location?: string;
  };
  timeline?: {
    deadline_date?: string | null;
    deadline_text?: string;
    posted_date?: string;
  };
  positions?: Array<{
    title?: string;
    employment_type?: string;
    experience_required?: string;
    headcount?: string;
    responsibilities?: string[];
    essential_qualifications?: string[];
    preferred_qualifications?: string[];
    tech_stack?: string[];
    tools?: string[];
    salary?: {
      type?: string;
      amount?: string;
      details?: string;
    };
    working_conditions?: {
      location?: string;
      work_hours?: string;
      work_type?: string;
    };
  }>;
  hiring_process?: string[];
  benefits?: string[];
  culture?: {
    keywords?: string[];
    description?: string;
  };
  additional_info?: any;
  
  // 구버전 호환성
  job_summary?: {
    company?: string;
    title?: string;
  };
  analysis?: any;
}
