import type { Job, JobJsonV2 } from '../types';
import { getCoordsFromAddress } from '../components/map/KakaoMapContainer';

/**
 * JSON 데이터를 Job 객체로 변환 (v2.0 - 동적 구조 지원)
 * 구버전 및 신버전 JSON 구조를 모두 지원
 */
export const parseJsonToJob = async (json: Partial<JobJsonV2>): Promise<Job> => {
  // 회사명 추출 (우선순위: company_info > job_summary)
  const company = json.company_info?.name || json.job_summary?.company || "알 수 없는 회사";
  
  // 포지션 정보 추출
  let role = "알 수 없는 직무";
  let responsibilities: string[] = [];
  let qualifications: string[] = [];
  let preferred: string[] = [];
  let techStack: string[] = [];
  let salary = "면접 후 협의";
  let workHours = "주 5일 (09:00 - 18:00)";
  let location = "미지정";
  
  // 신버전: positions 배열에서 추출
  if (json.positions && Array.isArray(json.positions) && json.positions.length > 0) {
    const firstPosition = json.positions[0];
    
    // 여러 포지션인 경우 표시
    if (json.positions.length > 1) {
      role = `${firstPosition.title || "포지션"} 외 ${json.positions.length - 1}건`;
    } else {
      role = firstPosition.title || "알 수 없는 직무";
    }
    
    responsibilities = firstPosition.responsibilities || [];
    qualifications = firstPosition.essential_qualifications || [];
    preferred = firstPosition.preferred_qualifications || [];
    techStack = firstPosition.tech_stack || [];
    
    // 급여 정보
    if (firstPosition.salary) {
      const salaryInfo = firstPosition.salary;
      if (salaryInfo.amount) {
        salary = `${salaryInfo.type || "연봉"}: ${salaryInfo.amount}`;
        if (salaryInfo.details) {
          salary += ` (${salaryInfo.details})`;
        }
      }
    }
    
    // 근무 조건
    if (firstPosition.working_conditions) {
      location = firstPosition.working_conditions.location || location;
      workHours = firstPosition.working_conditions.work_hours || workHours;
    }
  } 
  // 구버전: job_summary, analysis에서 추출
  else {
    role = json.job_summary?.title || "알 수 없는 직무";
    responsibilities = json.analysis?.key_responsibilities || [];
    qualifications = json.analysis?.essential_qualifications || [];
    preferred = json.analysis?.preferred_qualifications || [];
    techStack = json.analysis?.tools_and_knowledge || [];
    
    if (json.analysis?.working_conditions) {
      salary = json.analysis.working_conditions.salary || salary;
      location = json.analysis.working_conditions.location?.address || location;
      workHours = json.analysis.working_conditions.schedule?.work_hours || workHours;
    }
  }
  
  // 마감일 추출
  const deadline = json.timeline?.deadline_text || "채용시 마감";
  
  // 태그 추출 (기술 스택의 처음 3개)
  const tags = techStack.slice(0, 3);
  
  // 주소 좌표 변환
  let lat = 37.5665;
  let lng = 126.9780;
  
  if (location !== "미지정") {
    try {
      const coords = await getCoordsFromAddress(location);
      lat = coords.lat;
      lng = coords.lng;
    } catch (error) {
      console.error(`[Geocoding Error] 주소 변환 실패: ${location}`, error);
    }
  }
  
  // 원본 URL 추출
  const originalUrl = json.meta?.url || "#";
  
  return {
    id: Date.now(),
    company,
    role,
    status: 'INBOX',
    deadline,
    location,
    commuteTime: "거리 계산 필요",
    tags,
    lat,
    lng,
    rawJson: json, // 원본 JSON 보관
    detail: {
      responsibilities,
      qualifications,
      preferred,
      techStack,
      salary,
      originalUrl,
      workHours
    }
  };
};
