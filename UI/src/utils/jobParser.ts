import type { Job } from '../types';
import { getCoordsFromAddress } from '../components/map/KakaoMapContainer';

interface UploadedJson {
  meta: { url: string };
  timeline: { deadline_text: string };
  job_summary: { company: string; title: string };
  analysis: {
    key_responsibilities: string[];
    essential_qualifications: string[];
    preferred_qualifications: string[];
    tools_and_knowledge: string[];
    working_conditions: {
      salary: string;
      location: { address: string };
      schedule: { work_hours: string };
    };
  };
}

export const parseJsonToJob = async (json: Partial<UploadedJson>): Promise<Job> => {
  const location = json.analysis?.working_conditions?.location?.address ?? "미지정";
  let lat = 37.5665;
  let lng = 126.9780;

  if (location !== "미지정") {
    try {
      const coords = await getCoordsFromAddress(location);
      lat = coords.lat;
      lng = coords.lng;
    } catch (error) {
      console.error(`[Geocoding Error] 주소 변환에 실패했습니다: ${location}`, error);
    }
  }
  
  return {
    id: Date.now(),
    company: json.job_summary?.company ?? "알 수 없는 회사",
    role: json.job_summary?.title ?? "알 수 없는 직무",
    status: 'INBOX',
    deadline: json.timeline?.deadline_text || "채용시 마감",
    location,
    commuteTime: "거리 계산 필요",
    tags: json.analysis?.tools_and_knowledge?.slice(0, 3) ?? [],
    lat,
    lng,
    detail: {
      responsibilities: json.analysis?.key_responsibilities ?? [],
      qualifications: json.analysis?.essential_qualifications ?? [],
      preferred: json.analysis?.preferred_qualifications ?? [],
      techStack: json.analysis?.tools_and_knowledge ?? [],
      salary: json.analysis?.working_conditions?.salary ?? "면접 후 협의",
      originalUrl: json.meta?.url ?? "#",
      workHours: json.analysis?.working_conditions?.schedule?.work_hours ?? "주 5일 (09:00 - 18:00)"
    }
  };
};