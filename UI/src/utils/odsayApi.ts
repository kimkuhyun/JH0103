// src/utils/odsayApi.ts
const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY;
const ODSAY_BASE_URL = 'https://api.odsay.com/v1/api';

export interface TransitRoute {
  totalTime: number;
  totalDistance: number;
  payment: number;
  busTransitCount: number;
  subwayTransitCount: number;
  pathType: number;
  paths: PathSegment[];
  graphData?: GraphPoint[];
}

export interface PathSegment {
  type: 'walk' | 'bus' | 'subway';
  distance?: number;
  sectionTime: number;
  stationCount?: number;
  lane?: {
    name: string;
    type: number;
    startName: string;
    endName: string;
  };
}

export interface GraphPoint {
  x: number;
  y: number;
}

export async function searchTransitRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<TransitRoute[]> {
  if (!ODSAY_API_KEY) {
    console.warn('ODsay API 키가 설정되지 않았습니다.');
    return [];
  }

  try {
    // API 키를 URL 인코딩
    const encodedApiKey = encodeURIComponent(ODSAY_API_KEY);
    const url = `${ODSAY_BASE_URL}/searchPubTransPath?SX=${startLng}&SY=${startLat}&EX=${endLng}&EY=${endLat}&apiKey=${encodedApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    console.log('ODsay API Response:', data);

    if (data.error) {
      console.error('ODsay API 오류:', data.error);
      return [];
    }

    if (!data.result || !data.result.path || data.result.path.length === 0) {
      console.warn('경로를 찾을 수 없습니다.');
      return [];
    }

    return data.result.path.map((path: any) => {
      const route: TransitRoute = {
        totalTime: path.info?.totalTime || 0,
        totalDistance: path.info?.totalDistance || 0,
        payment: path.info?.payment || 0,
        busTransitCount: path.info?.busTransitCount || 0,
        subwayTransitCount: path.info?.subwayTransitCount || 0,
        pathType: path.info?.pathType || 3,
        paths: [],
      };

      if (path.subPath && Array.isArray(path.subPath)) {
        route.paths = path.subPath.map((sub: any) => {
          const segment: PathSegment = {
            type: sub.trafficType === 1 ? 'subway' : sub.trafficType === 2 ? 'bus' : 'walk',
            sectionTime: sub.sectionTime || 0,
          };

          if (sub.trafficType === 3) {
            segment.distance = sub.distance;
          } else if (sub.lane && sub.lane[0]) {
            segment.stationCount = sub.stationCount;
            segment.lane = {
              name: sub.lane[0].name || '',
              type: sub.lane[0].type || 0,
              startName: sub.startName || '',
              endName: sub.endName || '',
            };
          }

          return segment;
        });
      }

      if (path.info?.mapObj) {
        route.graphData = parseGraphData(path.info.mapObj);
      }

      return route;
    });
  } catch (error) {
    console.error('대중교통 경로 검색 오류:', error);
    return [];
  }
}

function parseGraphData(mapObj: string): GraphPoint[] {
  try {
    const points: GraphPoint[] = [];
    const segments = mapObj.split(':').slice(1);

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

export function formatRouteInfo(route: TransitRoute): string {
  const hours = Math.floor(route.totalTime / 60);
  const minutes = route.totalTime % 60;
  const timeStr = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  
  const transitCount = route.busTransitCount + route.subwayTransitCount;
  const transitStr = transitCount > 0 ? `환승 ${transitCount}회` : '직행';
  
  const paymentStr = `${route.payment.toLocaleString()}원`;
  
  return `${timeStr} · ${transitStr} · ${paymentStr}`;
}

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