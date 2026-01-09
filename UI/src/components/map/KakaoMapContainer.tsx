import { Map, MapMarker, CustomOverlayMap, ZoomControl, useKakaoLoader } from "react-kakao-maps-sdk";
import type{ Job } from "../../types/index.ts";
import { Loader2 } from "lucide-react"; 

interface Props {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  fullScreen?: boolean;
}

export function KakaoMapContainer({ jobs, selectedJobId, onSelectJob, fullScreen = false }: Props) {
  // [핵심] useKakaoLoader를 사용하여 스크립트를 안전하게 로드합니다.
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_API_KEY as string, 
    libraries: ["services", "clusterer"],
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  // 초기 중심 좌표 설정
  const center = selectedJob 
    ? { lat: selectedJob.lat, lng: selectedJob.lng } 
    : { lat: 37.5665, lng: 126.9780 };

  // 1. 로딩 중일 때 표시할 화면
  if (loading) return (
    <div className={`w-full h-full flex items-center justify-center bg-slate-100 ${!fullScreen && 'rounded-2xl'}`}>
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <Loader2 className="animate-spin" />
        <span className="text-xs">지도 불러오는 중...</span>
      </div>
    </div>
  );

  // 2. 에러 발생 시 표시할 화면
  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-red-500 text-sm">
      지도를 불러오는데 실패했습니다. API 키를 확인해주세요.
    </div>
  );

  // 3. 로딩 완료 후 지도 렌더링
  return (
    <div className={`w-full h-full relative ${!fullScreen && 'rounded-2xl overflow-hidden shadow-inner'}`}>
      <Map center={center} style={{ width: "100%", height: "100%" }} level={selectedJob ? 4 : 8}>
        <ZoomControl position={"RIGHT"} />
        
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
                  <div className="text-xs text-slate-500">{job.commuteTime} 거리</div>
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
    // Kakao Maps SDK가 로드되었는지 확인
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