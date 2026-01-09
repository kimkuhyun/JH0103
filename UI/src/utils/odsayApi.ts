// src/utils/odsayApi.ts
// ODsay API를 사용한 대중교통 경로 검색 유틸리티

const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY;
const ODSAY_BASE_URL = 'https://api.odsay.com/v1/api';

export interface TransitRoute {
  totalTime: number; // 총 소요 시간 (분)
  totalDistance: number; // 총 거리 (미터)
  payment: number; // 요금
  busTransitCount: number; // 버스 환승 횟수
  subwayTransitCount: number; // 지하철 환승 횟수
  pathType: number; // 경로 타입 (1: 지하철, 2: 버스, 3: 버스+지하철)
  paths: PathSegment[]; // 경로 세부 구간
  graphData?: GraphPoint[]; // 지도에 표시할 경로 좌표
}

export interface PathSegment {
  type: 'walk' | 'bus' | 'subway'; // 이동 수단
  distance?: number; // 거리 (도보인 경우)
  sectionTime: number; // 소요 시간
  stationCount?: number; // 정거장 수
  lane?: {
    name: string; // 노선명
    type: number; // 노선 타입
    startName: string; // 출발역/정류장
    endName: string; // 도착역/정류장
  };
}

export interface GraphPoint {
  x: number; // 경도
  y: number; // 위도
}

/**
 * ODsay API를 사용하여 대중교통 경로를 검색합니다.
 * @param startLat 출발지 위도
 * @param startLng 출발지 경도
 * @param endLat 도착지 위도
 * @param endLng 도착지 경도
 * @returns 경로 정보 배열 (최대 3개 경로)
 */
export async function searchTransitRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<TransitRoute[]> {
  if (!ODSAY_API_KEY) {
    throw new Error('ODsay API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
  }

  try {
    const url = `${ODSAY_BASE_URL}/searchPubTransPath?SX=${startLng}&SY=${startLat}&EX=${endLng}&EY=${endLat}&apiKey=${ODSAY_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ODsay API 오류: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`ODsay API 오류: ${data.error.message}`);
    }

    // 도시내 경로 결과 파싱
    if (!data.result || !data.result.path) {
      return [];
    }

    return data.result.path.map((path: any) => {
      const route: TransitRoute = {
        totalTime: path.info.totalTime,
        totalDistance: path.info.totalDistance,
        payment: path.info.payment,
        busTransitCount: path.info.busTransitCount,
        subwayTransitCount: path.info.subwayTransitCount,
        pathType: path.info.pathType,
        paths: [],
      };

      // 세부 구간 파싱
      if (path.subPath) {
        route.paths = path.subPath.map((sub: any) => {
          const segment: PathSegment = {
            type: sub.trafficType === 1 ? 'subway' : sub.trafficType === 2 ? 'bus' : 'walk',
            sectionTime: sub.sectionTime,
          };

          if (sub.trafficType === 3) {
            // 도보
            segment.distance = sub.distance;
          } else {
            // 대중교통
            segment.stationCount = sub.stationCount;
            if (sub.lane) {
              segment.lane = {
                name: sub.lane[0].name,
                type: sub.lane[0].type,
                startName: sub.startName,
                endName: sub.endName,
              };
            }
          }

          return segment;
        });
      }

      // 지도 표시용 좌표 데이터
      if (path.info.mapObj) {
        route.graphData = parseGraphData(path.info.mapObj);
      }

      return route;
    });
  } catch (error) {
    console.error('대중교통 경로 검색 오류:', error);
    throw error;
  }
}

/**
 * ODsay의 mapObj 문자열을 파싱하여 좌표 배열로 변환
 */
function parseGraphData(mapObj: string): GraphPoint[] {
  try {
    // mapObj 형식: "0:0@127.1,37.5:1@127.2,37.6:2@..."
    const points: GraphPoint[] = [];
    const segments = mapObj.split(':').slice(1); // 첫 번째 "0:0" 제거

    segments.forEach(segment => {
      const coords = segment.split('@')[1];
      if (coords) {
        const [x, y] = coords.split(',').map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y });
        }
      }
    });

    return points;
  } catch (error) {
    console.error('GraphData 파싱 오류:', error);
    return [];
  }
}

/**
 * 경로 정보를 한글 문자열로 포맷팅
 */
export function formatRouteInfo(route: TransitRoute): string {
  const hours = Math.floor(route.totalTime / 60);
  const minutes = route.totalTime % 60;
  const timeStr = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  
  const transitCount = route.busTransitCount + route.subwayTransitCount;
  const transitStr = transitCount > 0 ? `환승 ${transitCount}회` : '직행';
  
  const paymentStr = `${route.payment.toLocaleString()}원`;
  
  return `${timeStr} · ${transitStr} · ${paymentStr}`;
}

/**
 * 경로 타입에 따른 아이콘 이름 반환
 */
export function getRouteTypeIcon(pathType: number): string {
  switch (pathType) {
    case 1:
      return '지하철';
    case 2:
      return '버스';
    case 3:
      return '버스+지하철';
    default:
      return '대중교통';
  }
}