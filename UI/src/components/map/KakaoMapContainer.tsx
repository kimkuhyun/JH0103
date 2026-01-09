import { Map, MapMarker, CustomOverlayMap, ZoomControl } from "react-kakao-maps-sdk";
import { Job } from "../../types/index.ts";

interface Props {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  fullScreen?: boolean;
}

export function KakaoMapContainer({ jobs, selectedJobId, onSelectJob, fullScreen = false }: Props) {
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  // 선택된 공고가 있으면 거기로 이동, 없으면 서울 중심
  const center = selectedJob 
    ? { lat: selectedJob.lat, lng: selectedJob.lng } 
    : { lat: 37.5665, lng: 126.9780 };

  return (
    <div className={`w-full h-full relative ${!fullScreen && 'rounded-2xl overflow-hidden shadow-inner'}`}>
      <Map center={center} style={{ width: "100%", height: "100%" }} level={selectedJob ? 4 : 8}>
        <ZoomControl position={"RIGHT"} />
        
        {/* 마커 렌더링 */}
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
            {/* 선택 시 네비게이션 스타일 말풍선 */}
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