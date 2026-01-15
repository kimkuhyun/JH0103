export type JobStatus = 
  | 'INTERESTED'      // 관심
  | 'WILL_APPLY'      // 지원 예정
  | 'WRITING'         // 작성중
  | 'APPLIED'         // 지원 완료
  | 'DOCUMENT_PASS'   // 서류 합격
  | 'INTERVIEW'       // 면접 진행
  | 'FINAL_PASS'      // 최종 합격
  | 'REJECTED'        // 불합격
  | 'HOLD'            // 보류
  | 'INBOX';          // 받은편지함 (기본)

// JobStatus 한글 매핑
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  INTERESTED: '관심',
  WILL_APPLY: '지원 예정',
  WRITING: '작성중',
  APPLIED: '지원 완료',
  DOCUMENT_PASS: '서류 합격',
  INTERVIEW: '면접 진행',
  FINAL_PASS: '최종 합격',
  REJECTED: '불합격',
  HOLD: '보류',
  INBOX: '받은편지함',
};

// 상태별 색상 매핑
export const JOB_STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  INTERESTED: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  WILL_APPLY: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  WRITING: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  APPLIED: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
  DOCUMENT_PASS: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  INTERVIEW: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  FINAL_PASS: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
  HOLD: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  INBOX: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
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
