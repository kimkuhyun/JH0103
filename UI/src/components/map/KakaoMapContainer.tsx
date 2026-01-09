import { Map, MapMarker, CustomOverlayMap, ZoomControl, useKakaoLoader } from "react-kakao-maps-sdk";
import type { Job } from "../../types/index.ts";
import { Loader2, Home as HomeIcon } from "lucide-react";
import { TransitRouteOverlay } from './TransitRouteOverlay';
import type { TransitRoute } from '../../utils/odsayApi';

interface Props {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  homeLocation?: { address: string; lat: number; lng: number } | null;
  transitRoutes?: Map<number, TransitRoute>;
  fullScreen?: boolean;
}

export function KakaoMapContainer({ 
  jobs, 
  selectedJobId, 
  onSelectJob, 
  homeLocation,
  transitRoutes = new Map(),
  fullScreen = false 
}: Props) {
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_API_KEY as string, 
    libraries: ["services", "clusterer"],
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  
  // 지도 중심 좌표 결정
  let center = { lat: 37.5665, lng: 126.9780 }; // 기본: 서울 시청
  let level = 8;

  if (selectedJob && homeLocation) {
    // 선택된 공고와 집 위치의 중간 지점
    center = {
      lat: (homeLocation.lat + selectedJob.lat) / 2,
      lng: (homeLocation.lng + selectedJob.lng) / 2,
    };
    level = 7;
  } else if (selectedJob) {
    center = { lat: selectedJob.lat, lng: selectedJob.lng };
    level = 4;
  } else if (homeLocation) {
    center = { lat: homeLocation.lat, lng: homeLocation.lng };
    level = 6;
  }

  if (loading) return (
    <div className={`w-full h-full flex items-center justify-center bg-slate-100 ${!fullScreen && 'rounded-2xl'}`}>
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <Loader2 className="animate-spin" />
        <span className="text-xs">지도 불러오는 중...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-red-500 text-sm">
      지도를 불러오는데 실패했습니다. API 키를 확인해주세요.
    </div>
  );

  return (
    <div className={`w-full h-full relative ${!fullScreen && 'rounded-2xl overflow-hidden shadow-inner'}`}>
      <Map center={center} style={{ width: "100%", height: "100%" }} level={level}>
        <ZoomControl position={"RIGHT"} />
        
        {/* 집 위치 마커 */}
        {homeLocation && (
          <>
            <MapMarker
              position={{ lat: homeLocation.lat, lng: homeLocation.lng }}
              image={{
                src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
                size: { width: 24, height: 35 }
              }}
            />
            <CustomOverlayMap position={{ lat: homeLocation.lat, lng: homeLocation.lng }} yAnchor={1.3}>
              <div className="bg-white px-3 py-2 rounded-lg shadow-lg border-2 border-amber-500">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <HomeIcon size={14} className="text-amber-500" />
                  집
                </div>
              </div>
            </CustomOverlayMap>
          </>
        )}

        {/* 대중교통 경로 표시 */}
        {selectedJob && homeLocation && transitRoutes.has(selectedJob.id) && (
          <TransitRouteOverlay
            route={transitRoutes.get(selectedJob.id)!}
            homeLocation={{ lat: homeLocation.lat, lng: homeLocation.lng }}
            jobLocation={{ lat: selectedJob.lat, lng: selectedJob.lng }}
            color="#14B8A6"
          />
        )}
        
        {/* 공고 마커 */}
        {jobs.map(job => (
          <div key={job.id}>
            <MapMarker
              position={{ lat: job.lat, lng: job.lng }}
              onClick={() => onSelectJob(job.id)}
              image={{
                src: selectedJobId === job.id 
                  ? "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png" 
                  : "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png",
                size: { width: 24, height: 35 }
              }}
            />
            {selectedJobId === job.id && (
              <CustomOverlayMap position={{ lat: job.lat, lng: job.lng }} yAnchor={1}>
                <div className="relative bottom-10 bg-white p-3 rounded-xl shadow-xl border-2 border-teal-600 animate-bounce z-50">
                  <div className="text-sm font-bold text-slate-800 whitespace-nowrap">{job.company}</div>
                  <div className="text-xs text-slate-500">{job.commuteTime}</div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-teal-600 transform rotate-45"></div>
                </div>
              </CustomOverlayMap>
            )}
          </div>
        ))}
      </Map>
    </div>
  );
}

export const getCoordsFromAddress = (address: string): Promise<{lat: number, lng: number}> => {
  return new Promise((resolve, reject) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      reject(new Error("Kakao Maps API is not loaded"));
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(address, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
        });
      } else {
        reject(new Error("Address search failed"));
      }
    });
  });
};