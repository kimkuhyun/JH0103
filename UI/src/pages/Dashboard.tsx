import { useState, useRef, useEffect } from 'react';
import type { Job, JobStatus, BackendJob } from '../types/index';
import { KakaoMapContainer } from '../components/map/KakaoMapContainer';
import { Plus, Filter, Clock, Navigation, MapPin, X, ExternalLink, Briefcase, Code2, Building2, Home as HomeIcon, Settings } from 'lucide-react';
import { parseJsonToJob } from '../utils/jobParser';
import { HomeLocationSettings } from '../components/settings/HomeLocationSettings';
import { searchTransitRoute, formatRouteInfo } from '../utils/odsayApi';
import type { TransitRoute } from '../utils/odsayApi';

interface HomeLocation {
  address: string;
  lat: number;
  lng: number;
}

export function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showHomeSettings, setShowHomeSettings] = useState(false);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [transitRoutes, setTransitRoutes] = useState<Map<number, TransitRoute>>(new Map());
  const [loadingRoutes, setLoadingRoutes] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // 로컬스토리지에서 집 위치 불러오기
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        // 프록시 설정 덕분에 http://localhost:8080/api/v1/jobs 로 요청됨
        const response = await fetch('/api/v1/jobs');
        
        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status}`);
        }

        const backendData: BackendJob[] = await response.json();

        // DB 데이터를 UI용 Job 객체로 변환 (비동기 처리)
        const convertedJobs = await Promise.all(
          backendData.map(async (dbJob) => {
            try {
              // DB의 JSON 문자열 파싱
              const jsonContent = JSON.parse(dbJob.jobDetailJson);
              
              // 기존 파서 유틸리티로 변환
              const parsedJob = await parseJsonToJob(jsonContent);

              // DB의 최신 정보(ID, Status, 회사명 등)로 덮어쓰기
              return {
                ...parsedJob,
                id: dbJob.id, 
                company: dbJob.companyName,
                role: dbJob.roleName,
                status: dbJob.status as JobStatus,
              };
            } catch (e) {
              console.error(`공고 변환 실패 (ID: ${dbJob.id})`, e);
              return null;
            }
          })
        );

        // null 값(실패한 건) 제외하고 상태 업데이트
        setJobs(convertedJobs.filter((j): j is Job => j !== null));

      } catch (error) {
        console.error('공고 로딩 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // 집 위치가 설정되면 모든 공고의 대중교통 경로 계산
  useEffect(() => {
    if (homeLocation) {
      jobs.forEach(job => {
        if (!transitRoutes.has(job.id) && !loadingRoutes.has(job.id)) {
          fetchTransitRoute(job);
        }
      });
    }
  }, [homeLocation, jobs]);

  // 대중교통 경로 검색
  const fetchTransitRoute = async (job: Job) => {
    if (!homeLocation) return;

    setLoadingRoutes(prev => new Set(prev).add(job.id));

    try {
      const routes = await searchTransitRoute(
        homeLocation.lat,
        homeLocation.lng,
        job.lat,
        job.lng
      );

      if (routes && routes.length > 0) {
        // 가장 빠른 경로 선택
        const fastestRoute = routes[0];
        setTransitRoutes(prev => new Map(prev).set(job.id, fastestRoute));

        // Job의 commuteTime 업데이트
        setJobs(prevJobs => 
          prevJobs.map(j => 
            j.id === job.id 
              ? { ...j, commuteTime: formatRouteInfo(fastestRoute) }
              : j
          )
        );
      }
    } catch (error) {
      console.error(`경로 검색 실패 (${job.company}):`, error);
      // 오류 시 기본 텍스트로 표시
      setJobs(prevJobs => 
        prevJobs.map(j => 
          j.id === job.id 
            ? { ...j, commuteTime: '경로 검색 실패' }
            : j
        )
      );
    } finally {
      setLoadingRoutes(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        const newJob = await parseJsonToJob(jsonContent);
        
        setJobs(prev => [newJob, ...prev]);
        setSelectedJobId(newJob.id);
        
        // 집 위치가 설정되어 있으면 경로 계산
        if (homeLocation) {
          fetchTransitRoute(newJob);
        }
        
        alert(`[${newJob.company}] 공고가 추가되었습니다.`);
      } catch (error) {
        console.error('JSON 파싱 오류:', error);
        alert('지원하지 않는 형식이거나 잘못된 JSON 파일입니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleSaveHomeLocation = (location: HomeLocation) => {
    setHomeLocation(location);
    // 모든 공고의 경로 재계산
    setTransitRoutes(new Map());
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* 헤더 */}
      <header className="h-[72px] border-b border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white z-20 relative">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Briefcase className="text-teal-600" /> 채용 공고 관리
        </h2>
        
        <div className="flex gap-3">
          {/* 집 위치 설정 버튼 */}
          <button
            onClick={() => setShowHomeSettings(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
              homeLocation
                ? 'bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50'
                : 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            {homeLocation ? '집 위치 변경' : '집 위치 설정'}
          </button>

          {/* 공고 추가 버튼 */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden" 
            accept=".json"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />공고 추가
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 왼쪽 리스트 */}
        <div className="w-[400px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] shrink-0">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <span className="font-bold text-slate-700">총 <span className="text-teal-600">{jobs.length}</span>건</span>
            <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded transition-colors">
              <Filter size={14} /> 필터
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
            {isLoading && (
              <div className="text-center py-10 text-slate-400">
                데이터를 불러오는 중입니다...
              </div>
            )}

            {!isLoading && jobs.length === 0 && (
               <div className="text-center py-10 text-slate-400">
                 등록된 공고가 없습니다.
               </div>
            )}
            {jobs.map(job => {
              const isLoadingRoute = loadingRoutes.has(job.id);
              
              return (
                <div 
                  key={job.id} 
                  onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 group ${
                    selectedJobId === job.id 
                      ? 'bg-white border-teal-500 ring-2 ring-teal-50/50 shadow-md transform scale-[1.02]' 
                      : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between mb-2">
                    <div className="font-bold text-slate-800 truncate pr-2 flex items-center gap-2">
                      {job.company}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${
                      job.status === 'INBOX' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-3 font-medium line-clamp-2 leading-relaxed">
                    {job.role}
                  </div>

                  {job.tags && job.tags.length > 0 && (
                    <div className="flex gap-1 mb-3 flex-wrap">
                      {job.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-50 group-hover:border-slate-100 transition-colors">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock size={12} className="text-orange-400"/> {job.deadline}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Navigation size={12} className={isLoadingRoute ? 'animate-spin text-teal-500' : 'text-teal-500'}/>
                      {isLoadingRoute ? '계산중...' : job.commuteTime}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 중간 상세 패널 */}
        {selectedJob && (
          <div className="w-[450px] h-full bg-white shadow-lg z-10 overflow-y-auto border-l border-r border-slate-200 shrink-0">
            <div className="min-h-full pb-10">
              <div className="h-32 bg-gradient-to-r from-teal-500 to-emerald-600 relative p-6 flex justify-end items-start">
                <button 
                  onClick={() => setSelectedJobId(null)} 
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-8 left-8 bg-white p-3 rounded-2xl shadow-lg border border-slate-100">
                  <Building2 className="w-8 h-8 text-teal-600" />
                </div>
              </div>

              <div className="px-8 pt-12">
                <h1 className="text-xl font-bold text-slate-900 leading-tight mb-2">
                  {selectedJob.role}
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-6">
                  <span>{selectedJob.company}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin size={14} /> {selectedJob.location}
                  </span>
                </div>

                {/* 출퇴근 정보 */}
                {homeLocation && transitRoutes.has(selectedJob.id) && (
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-teal-700 mb-2">
                      <HomeIcon size={16} />
                      집에서 출근 시
                    </div>
                    <div className="text-xs text-slate-600">
                      {formatRouteInfo(transitRoutes.get(selectedJob.id)!)}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-400 font-bold mb-1">연봉</div>
                    <div className="text-sm font-bold text-slate-700">{selectedJob.detail?.salary || "면접 후 협의"}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-400 font-bold mb-1">근무 시간</div>
                    <div className="text-sm font-bold text-slate-700">{selectedJob.detail?.workHours || "09:00 - 18:00"}</div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <Briefcase size={16} className="text-teal-500"/> 주요 업무
                  </h3>
                  <div className="bg-white p-1">
                    {selectedJob.detail?.responsibilities ? (
                      <ul className="space-y-2">
                        {selectedJob.detail.responsibilities.map((item, idx) => (
                          <li key={idx} className="flex gap-3 text-slate-600 text-xs leading-relaxed">
                            <span className="text-teal-400 mt-1.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-slate-400 text-sm">상세 정보가 없습니다.</p>}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <Code2 size={16} className="text-indigo-500"/> 필요 기술
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.detail?.techStack ? (
                      selectedJob.detail.techStack.map((tech, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100">
                          {tech}
                        </span>
                      ))
                    ) : (
                      selectedJob.tags?.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg">
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-10 pt-6 border-t border-slate-100">
                   <a 
                     href={selectedJob.detail?.originalUrl || "#"} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-200"
                   >
                     <ExternalLink size={16} /> 원문 공고 보기
                   </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 오른쪽 지도 */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          <KakaoMapContainer 
            jobs={jobs} 
            selectedJobId={selectedJobId} 
            onSelectJob={setSelectedJobId}
            homeLocation={homeLocation}
            transitRoutes={transitRoutes}
            fullScreen={true} 
          />
        </div>
      </div>

      {/* 집 위치 설정 모달 */}
      {showHomeSettings && (
        <HomeLocationSettings
          onClose={() => setShowHomeSettings(false)}
          onSave={handleSaveHomeLocation}
        />
      )}
    </div>
  );
}