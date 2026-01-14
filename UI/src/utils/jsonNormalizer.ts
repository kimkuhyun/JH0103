/**
 * JSON 정규화 및 검증 모듈
 * 
 * 모든 JSON 처리 로직을 한 곳에 집중:
 * - 구버전(V1: job_summary, analysis) → 신버전(V2: positions[]) 자동 변환
 * - 필드 검증 및 기본값 설정
 * - 주소 정제, 회사명 추출 등
 * - 강력한 예외 처리
 */

import type { JobJsonV2 } from '../types';

// ==================== 타입 정의 ====================

/** 구버전 JSON 구조 (V1) */
interface JobJsonV1 {
  job_summary?: {
    company?: string;
    title?: string;
    url?: string;
  };
  analysis?: {
    key_responsibilities?: string[];
    essential_qualifications?: string[];
    preferred_qualifications?: string[];
    tools_and_knowledge?: string[];
    working_conditions?: {
      salary?: string;
      location?: {
        address?: string;
      };
      schedule?: {
        work_hours?: string;
      };
    };
  };
  meta?: {
    url?: string;
  };
}

/** 정규화 결과 */
export interface NormalizedJobJson {
  version: 'v1' | 'v2';
  original: any;
  normalized: JobJsonV2;
  companyName: string;
  positionTitle: string;
  warnings: string[];
}

// ==================== 유틸리티 함수 ====================

/**
 * 안전한 문자열 추출 (기본값 처리)
 */
function safeString(value: any, defaultValue: string = ''): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return defaultValue;
  return String(value).trim();
}

/**
 * 안전한 배열 추출 (기본값 처리)
 */
function safeArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
}

/**
 * 주소 정제 (건물명, 층수, 우편번호, 지하철 거리 정보 제거)
 */
export function cleanAddress(address: string): string {
  if (!address) return '';
  
  let cleaned = address
    // 접두어 제거
    .replace(/^(근무지|주소|위치|근무장소)[:\s]*/g, '')
    // 괄호 안 내용 제거
    .replace(/\(.*?\)/g, '')
    // 대괄호 안 내용 제거
    .replace(/\[.*?\]/g, '')
    .trim();
  
  // 상세 주소 패턴 추출 (도로명/지번 주소)
  const addressMatch = cleaned.match(/([가-힣A-Za-z0-9\s\-\.]+(?:로|길|동|가|읍|면|리)\s*\d+(?:-\d+)?)/);
  
  if (addressMatch) {
    cleaned = addressMatch[0].trim();
  }
  
  return cleaned || '위치 정보 없음';
}

/**
 * 회사명 추출 (우선순위 적용)
 */
function extractCompanyName(json: any): string {
  // 우선순위 1: company_info.name
  const companyInfo = safeString(json.company_info?.name);
  if (companyInfo) return companyInfo;
  
  // 우선순위 2: job_summary.company (구버전)
  const jobSummary = safeString(json.job_summary?.company);
  if (jobSummary) return jobSummary;
  
  // 우선순위 3: positions[0].company (혹시 모를 경우)
  const positions = json.positions;
  if (Array.isArray(positions) && positions.length > 0) {
    const posCompany = safeString(positions[0].company);
    if (posCompany) return posCompany;
  }
  
  return '알 수 없는 회사';
}

/**
 * 포지션 제목 추출 (여러 포지션 처리)
 */
function extractPositionTitle(json: any): string {
  const positions = json.positions;
  
  if (Array.isArray(positions) && positions.length > 0) {
    const firstTitle = safeString(positions[0].title, '포지션');
    
    if (positions.length === 1) {
      return firstTitle;
    } else {
      return `${firstTitle} 외 ${positions.length - 1}건`;
    }
  }
  
  // 구버전 호환
  return safeString(json.job_summary?.title, '알 수 없는 직무');
}

// ==================== V1 → V2 변환 ====================

/**
 * 구버전 JSON을 신버전으로 변환
 */
function convertV1ToV2(v1: JobJsonV1): JobJsonV2 {
  const warnings: string[] = [];
  
  // 회사 정보 변환
  const companyInfo = {
    name: safeString(v1.job_summary?.company, '알 수 없는 회사'),
    business_type: '',
    description: '',
    employee_count: '',
    established: '',
    location: ''
  };
  
  // 포지션 정보 변환
  const position: JobJsonV2['positions'][0] = {
    title: safeString(v1.job_summary?.title, '알 수 없는 직무'),
    employment_type: '',
    experience_required: '',
    headcount: '',
    responsibilities: safeArray(v1.analysis?.key_responsibilities),
    essential_qualifications: safeArray(v1.analysis?.essential_qualifications),
    preferred_qualifications: safeArray(v1.analysis?.preferred_qualifications),
    tech_stack: safeArray(v1.analysis?.tools_and_knowledge),
    tools: [],
    salary: {
      type: '',
      amount: safeString(v1.analysis?.working_conditions?.salary, '면접 후 협의'),
      details: ''
    },
    working_conditions: {
      work_hours: safeString(v1.analysis?.working_conditions?.schedule?.work_hours, '주 5일 (09:00 - 18:00)'),
      work_type: '',
      location: cleanAddress(safeString(v1.analysis?.working_conditions?.location?.address, ''))
    }
  };
  
  const v2: JobJsonV2 = {
    company_info: companyInfo,
    positions: [position],
    timeline: {
      deadline_text: '채용시 마감',
      posted_date: ''
    },
    benefits: [],
    hiring_process: [],
    culture: {
      keywords: [],
      description: ''
    },
    meta: {
      url: safeString(v1.meta?.url || v1.job_summary?.url, '#'),
      captured_at: new Date().toISOString()
    },
    raw_text: ''
  };
  
  if (warnings.length > 0) {
    console.warn('[jsonNormalizer] V1 변환 경고:', warnings);
  }
  
  return v2;
}

// ==================== 메인 정규화 함수 ====================

/**
 * JSON 정규화 (구버전/신버전 자동 감지 및 변환)
 * 
 * @param rawJson - 원본 JSON (any 타입)
 * @returns 정규화된 결과
 * @throws 치명적인 파싱 오류 발생 시
 */
export function normalizeJobJson(rawJson: any): NormalizedJobJson {
  const warnings: string[] = [];
  
  try {
    // 1. 빈 값 체크
    if (!rawJson || typeof rawJson !== 'object') {
      throw new Error('유효하지 않은 JSON 형식');
    }
    
    // 2. 버전 감지
    const hasPositions = Array.isArray(rawJson.positions);
    const hasJobSummary = rawJson.job_summary && typeof rawJson.job_summary === 'object';
    
    let normalized: JobJsonV2;
    let version: 'v1' | 'v2';
    
    if (hasPositions) {
      // 신버전 (V2)
      version = 'v2';
      normalized = rawJson as JobJsonV2;
      
      // V2 검증 및 기본값 설정
      if (!normalized.company_info) {
        normalized.company_info = {
          name: extractCompanyName(rawJson),
          business_type: '',
          description: '',
          employee_count: '',
          established: '',
          location: ''
        };
        warnings.push('company_info 누락 - 기본값 설정');
      }
      
      if (!Array.isArray(normalized.positions) || normalized.positions.length === 0) {
        throw new Error('positions 배열이 비어있음');
      }
      
      // 주소 정제
      normalized.positions.forEach((pos, idx) => {
        if (pos.working_conditions?.location) {
          pos.working_conditions.location = cleanAddress(pos.working_conditions.location);
        }
      });
      
    } else if (hasJobSummary) {
      // 구버전 (V1) - 자동 변환
      version = 'v1';
      normalized = convertV1ToV2(rawJson as JobJsonV1);
      warnings.push('구버전(V1) JSON 감지 - V2로 자동 변환됨');
      
    } else {
      throw new Error('알 수 없는 JSON 구조 (positions도 job_summary도 없음)');
    }
    
    // 3. 필수 메타 정보 보완
    if (!normalized.meta) {
      normalized.meta = {
        url: '#',
        captured_at: new Date().toISOString()
      };
      warnings.push('meta 정보 누락 - 기본값 설정');
    }
    
    if (!normalized.timeline) {
      normalized.timeline = {
        deadline_text: '채용시 마감',
        posted_date: ''
      };
      warnings.push('timeline 정보 누락 - 기본값 설정');
    }
    
    // 4. 회사명 및 포지션 제목 추출
    const companyName = extractCompanyName(normalized);
    const positionTitle = extractPositionTitle(normalized);
    
    return {
      version,
      original: rawJson,
      normalized,
      companyName,
      positionTitle,
      warnings
    };
    
  } catch (error) {
    console.error('[jsonNormalizer] 정규화 실패:', error);
    throw new Error(`JSON 정규화 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 파일명 생성 (정규화된 정보 기반)
 */
export function generateJobFilename(normalized: NormalizedJobJson): string {
  const { companyName, positionTitle } = normalized;
  
  // 파일명용 문자열 정제
  const sanitize = (str: string) => {
    return str
      .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .substring(0, 50); // 길이 제한
  };
  
  const safeName = sanitize(`${companyName}_${positionTitle}`);
  const timestamp = Date.now();
  
  return `${safeName}_${timestamp}.json`;
}
