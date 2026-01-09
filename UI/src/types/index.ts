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
