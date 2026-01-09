import { Polyline, CustomOverlayMap } from 'react-kakao-maps-sdk';
import type { TransitRoute } from '../../utils/odsayApi';
import { formatRouteInfo, getRouteTypeIcon } from '../../utils/odsayApi';

interface Props {
  route: TransitRoute;
  homeLocation: { lat: number; lng: number };
  jobLocation: { lat: number; lng: number };
  color?: string;
}

export function TransitRouteOverlay({ route, homeLocation, jobLocation, color = '#FF6B6B' }: Props) {
  // 경로 좌표 데이터가 있으면 사용, 없으면 직선으로 표시
  const pathCoords = route.graphData && route.graphData.length > 0
    ? route.graphData.map(point => ({ lat: point.y, lng: point.x }))
    : [
        { lat: homeLocation.lat, lng: homeLocation.lng },
        { lat: jobLocation.lat, lng: jobLocation.lng },
      ];

  // 중간 지점 계산 (정보 표시용)
  const midLat = (homeLocation.lat + jobLocation.lat) / 2;
  const midLng = (homeLocation.lng + jobLocation.lng) / 2;

  return (
    <>
      {/* 경로 라인 */}
      <Polyline
        path={pathCoords}
        strokeWeight={5}
        strokeColor={color}
        strokeOpacity={0.8}
        strokeStyle="solid"
      />

      {/* 경로 정보 오버레이 */}
      <CustomOverlayMap position={{ lat: midLat, lng: midLng }}>
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border-2 border-teal-500 text-xs font-bold whitespace-nowrap">
          <div className="text-teal-600 mb-1">{getRouteTypeIcon(route.pathType)}</div>
          <div className="text-slate-700">{formatRouteInfo(route)}</div>
        </div>
      </CustomOverlayMap>
    </>
  );
}