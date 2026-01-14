import type { Job } from '../types';
import { getCoordsFromAddress } from '../components/map/KakaoMapContainer';
import { normalizeJobJson } from './jsonNormalizer';

/**
 * JSON 데이터를 Job 객체로 변환 (단순화 버전)
 * 
 * 모든 복잡한 JSON 처리는 jsonNormalizer에서 담당
 * 이 함수는 정규화된 JSON을 Job 모델로 변환만 수행
 */
export const parseJsonToJob = async (rawJson: any): Promise<Job> => {
  try {
    // 1. JSON 정규화 (구버전→신버전 변환, 검증, 필드 정제)
    const { normalized, companyName, positionTitle, warnings } = normalizeJobJson(rawJson);
    
    // 경고가 있으면 콘솔에 출력
    if (warnings.length > 0) {
      console.warn(`[jobParser] ${companyName}: `, warnings);
    }
    
    // 2. 기본 정보 추출 (이미 정규화됨)
    const firstPosition = normalized.positions[0];
    const deadline = normalized.timeline?.deadline_text || '채용시 마감';
    const location = firstPosition.working_conditions?.location || '위치 정보 없음';
    
    // 3. 태그 생성 (기술 스택 상위 3개)
    const techStack = firstPosition.tech_stack || [];
    const tags = techStack.slice(0, 3);
    
    // 4. 좌표 변환
    let lat = 37.5665; // 서울시청 기본값
    let lng = 126.9780;
    
    if (location !== '위치 정보 없음') {
      try {
        const coords = await getCoordsFromAddress(location);
        lat = coords.lat;
        lng = coords.lng;
      } catch (error) {
        console.error(`[jobParser] 좌표 변환 실패 (${location}):`, error);
      }
    }
    
    // 5. 급여 정보 문자열 생성
    let salary = '면접 후 협의';
    if (firstPosition.salary?.amount) {
      salary = firstPosition.salary.amount;
      if (firstPosition.salary.type) {
        salary = `${firstPosition.salary.type}: ${salary}`;
      }
      if (firstPosition.salary.details) {
        salary += ` (${firstPosition.salary.details})`;
      }
    }
    
    // 6. Job 객체 생성
    return {
      id: Date.now(),
      company: companyName,
      role: positionTitle,
      status: 'INBOX',
      deadline,
      location,
      commuteTime: '거리 계산 필요',
      tags,
      lat,
      lng,
      rawJson: normalized, // 정규화된 V2 JSON 저장
      detail: {
        responsibilities: firstPosition.responsibilities || [],
        qualifications: firstPosition.essential_qualifications || [],
        preferred: firstPosition.preferred_qualifications || [],
        techStack: firstPosition.tech_stack || [],
        salary,
        originalUrl: normalized.meta?.url || '#',
        workHours: firstPosition.working_conditions?.work_hours || '주 5일 (09:00 - 18:00)'
      }
    };
    
  } catch (error) {
    console.error('[jobParser] 파싱 실패:', error);
    
    // 최소한의 폴백 Job 객체 반환
    return {
      id: Date.now(),
      company: '파싱 실패',
      role: '정보 없음',
      status: 'INBOX',
      deadline: '알 수 없음',
      location: '알 수 없음',
      commuteTime: '-',
      tags: [],
      lat: 37.5665,
      lng: 126.9780,
      rawJson: null,
      detail: {
        responsibilities: [],
        qualifications: [],
        preferred: [],
        techStack: [],
        salary: '-',
        originalUrl: '#',
        workHours: '-'
      }
    };
  }
};
