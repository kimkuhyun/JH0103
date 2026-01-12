export type JobStatus = 'INBOX' | 'WRITING' | 'APPLIED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';

export interface Job{
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  deadline: string;
  location: string;
  commuteTime: string; // '계산중' or '45분' 등 텍스트로 처리
  tags: string[];
  lat: number;
  lng: number;
  detail?: JobDetail;
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
  companyName: string; // Java 엔티티 필드명
  roleName: string;
  status: string;
  originalUrl: string;
  jobDetailJson: string; // MySQL의 JSON 컬럼 (문자열로 옴)
  screenshot?: string;   // Base64 이미지
  createdAt: string;
}