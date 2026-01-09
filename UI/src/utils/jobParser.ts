// src/utils/jobParser.ts
import type { Job } from '../types';
import { getCoordsFromAddress } from '../components/map/KakaoMapContainer';

// 사용자가 업로드하는 JSON 파일의 구조 정의
interface UploadedJson {
  meta: { url: string };
  timeline: { deadline_text: string };
  job_summary: { company: string; title: string };
  analysis: {
    key_responsibilities: string[];
    essential_qualifications: string[];
    preferred_qualifications: string[];
    tools_and_knowledge: string[];
  };
  working_conditions: {
    salary: string;
    location: { address: string };
    schedule: { work_houres: string };
  };
}

export const parseJsonToJob = async (json: Partial<UploadedJson>): Promise<Job> => {
  const location = json.working_conditions?.location?.address ?? "미지정";
  let lat = 37.5665; // 기본값 (서울 시청)
  let lng = 126.9780;

  if (location !== "미지정") {
    try {
      // Kakao Maps SDK가 로드될 때까지 기다리는 로직이 필요할 수 있습니다.
      // 여기서는 KakaoMapContainer가 먼저 렌더링되어 SDK가 로드되었다고 가정합니다.
      const coords = await getCoordsFromAddress(location);
      lat = coords.lat;
      lng = coords.lng;
    } catch (error) {
      console.error(`[Geocoding Error] 주소 변환에 실패했습니다: ${location}`, error);
      // 주소 변환에 실패하면 기본 좌표를 사용합니다.
    }
  }
  
  return {
    id: Date.now(), // 고유 ID 생성
    company: json.job_summary?.company ?? "알 수 없는 회사",
    role: json.job_summary?.title ?? "알 수 없는 직무",
    status: 'INBOX',
    deadline: json.timeline?.deadline_text || "채용시 마감",
    location,
    commuteTime: "거리 계산 필요", // 추후 지도 API로 업데이트
    tags: json.analysis?.tools_and_knowledge?.slice(0, 3) ?? [], // 태그 3개만 추출
    lat,
    lng,
    detail: {
      responsibilities: json.analysis?.key_responsibilities ?? [],
      qualifications: json.analysis?.essential_qualifications ?? [],
      preferred: json.analysis?.preferred_qualifications ?? [],
      techStack: json.analysis?.tools_and_knowledge ?? [],
      salary: json.working_conditions?.salary ?? "면접 후 협의",
      originalUrl: json.meta?.url ?? "#",
      workHours: json.working_conditions?.schedule?.work_houres ?? "주 5일 (09:00 - 18:00)"
    }
  };
};