export type JobStatus = 
  | 'PENDING'    // 대기중
  | 'DRAFT'      // 작성중
  | 'APPLIED'    // 지원 완료
  | 'CLOSED';    // 종료됨

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: '대기중',
  DRAFT: '작성중',
  APPLIED: '지원 완료',
  CLOSED: '종료됨',
};

export const JOB_STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  DRAFT: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  APPLIED: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
  CLOSED: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
};


export interface Job {
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
  rawJson?: any;
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
  
  job_summary?: {
    company?: string;
    title?: string;
  };
  analysis?: any;
}

// 회사 조사 관련 타입
export interface CompanyResearchData {
  companyId: number;
  jobId: number;
  companySearchResult: any; // 유연한 JSON 형식
  createdAt: string;
}

export interface CompanyResearchResponse {
  success: boolean;
  exists?: boolean;
  message?: string;
  data?: CompanyResearchData;
  error?: string;
}

export type ResearchStatus = 'idle' | 'searching' | 'crawling' | 'analyzing' | 'completed' | 'error';
