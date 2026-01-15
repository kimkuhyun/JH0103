import { useState, useRef, useEffect } from 'react';
import type { Job, JobStatus, BackendJob } from '../types/index';
import { JOB_STATUS_LABELS as STATUS_LABELS, JOB_STATUS_COLORS as STATUS_COLORS } from '../types/index';
import { KakaoMapContainer } from '../components/map/KakaoMapContainer';
import { Plus, Filter, Clock, Navigation, MapPin, X, ExternalLink, Building2, Home as HomeIcon, Maximize2, Trash2, Briefcase, Search, Check} from 'lucide-react';
import { parseJsonToJob } from '../utils/jobParser';
import { normalizeJobJson } from '../utils/jsonNormalizer';
import { HomeLocationSettings } from '../components/settings/HomeLocationSettings';
import { searchTransitRoute, formatRouteInfo } from '../utils/odsayApi';
import type { TransitRoute } from '../utils/odsayApi';
import { DynamicJobDetail } from '../components/job/DynamicJobDetail';

interface HomeLocation {
  address: string;
  lat: number;
  lng: number;
}

function getShortLocation(fullAddress: string): string {
  if (!fullAddress || fullAddress === '위치 정보 없음' || fullAddress === '알 수 없음') {
    return '위치 미상';
  }
  const parts = fullAddress.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] || '위치 미상';
}

function getJobRole(job: Job): string {
  if (job.role && job.role !== '알 수 없는 직무' && job.role !== 'Untitled Role') {
    return job.role;
  }
  if (job.rawJson && job.rawJson.positions && job.rawJson.positions.length > 0) {
    const title = job.rawJson.positions[0].title;
    if (title) {
      if (job.rawJson.positions.length > 1) {
        return `${title} 외 ${job.rawJson.positions.length - 1}건`;
      }
      return title;
    }
  }
  if (job.rawJson && (job.rawJson as any).job_summary?.title) {
    return (job.rawJson as any).job_summary.title;
  }
  return '포지션 정보 없음';
}

export function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showHomeSettings, setShowHomeSettings] = useState(false);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [transitRoutes, setTransitRoutes] = useState<Map<number, TransitRoute>>(new Map());
  const [loadingRoutes, setLoadingRoutes] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'ALL'>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v1/jobs');
        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status}`);
        }
        const backendData: BackendJob[] = await response.json();
        const convertedJobs = await Promise.all(
          backendData.map(async (dbJob) => {
            try {
              const jsonContent = JSON.parse(dbJob.jobDetailJson);
              const { normalized, companyName, positionTitle } = normalizeJobJson(jsonContent);
              const parsedJob = await parseJsonToJob(jsonContent);
              return {
                ...parsedJob,
                id: dbJob.id,
                company: dbJob.companyName || companyName,
                role: dbJob.roleName || positionTitle,
                status: dbJob.status as JobStatus,
                rawJson: normalized,
                detail: {
                  ...parsedJob.detail,
                  screenshot: dbJob.screenshot || ""
                }
              };
            } catch (e) {
              console.error(`공고 변환 실패 (ID: ${dbJob.id})`, e);
              return null;
            }
          })
        );
        setJobs(convertedJobs.filter((j): j is Job => j !== null));
      } catch (error) {
        console.error('공고 로딩 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (homeLocation) {
      jobs.forEach(job => {
        if (!transitRoutes.has(job.id) && !loadingRoutes.has(job.id)) {
          fetchTransitRoute(job);
        }
      });
    }
  }, [homeLocation, jobs]);

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
        const fastestRoute = routes[0];
        setTransitRoutes(prev => new Map(prev).set(job.id, fastestRoute));
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
    setTransitRoutes(new Map());
  };

  const handleStatusChange = async (jobId: number, newStatus: JobStatus) => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        setJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, status: newStatus } : j))
        );
      } else {
        const errorText = await response.text();
        console.error('상태 변경 실패:', response.status, errorText);
        throw new Error(`상태 변경 실패: ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}개의 공고를 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/v1/jobs/${id}`, { 
            method: 'DELETE',
            credentials: 'include'
          })
        )
      );
      setJobs(prev => prev.filter(job => !selectedIds.has(job.id)));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      if (selectedJobId && selectedIds.has(selectedJobId)) {
        setSelectedJobId(null);
      }
      alert("선택한 공고가 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredJobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredJobs.map(j => j.id)));
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getJobRole(job).toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <header className="h-[72px] border-b border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white z-20 relative">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Briefcase className="text-teal-600" /> 채용 공고 관리
        </h2>
        <div className="flex gap-3">
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

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-[330px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] shrink-0">
          <div className="p-5 border-b border-slate-100 bg-white sticky top-0 z-10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">총 <span className="text-teal-600">{filteredJobs.length}</span>건</span>
              <div className="flex gap-2">
                {isSelectionMode && (
                  <>
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:bg-teal-50 px-2 py-1 rounded transition-colors"
                    >
                      <Check size={14} /> 전체선택
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} /> 삭제 ({selectedIds.size})
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedIds(new Set());
                  }}
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded transition-colors ${
                    isSelectionMode ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  선택
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                  >
                    <Filter size={14} /> 필터
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
                      <button
                        onClick={() => { setFilterStatus('ALL'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${filterStatus === 'ALL' ? 'text-teal-600 font-bold' : 'text-slate-700'}`}
                      >
                        전체 보기
                      </button>
                      {(Object.keys(STATUS_LABELS) as JobStatus[]).map(status => (
                        <button
                          key={status}
                          onClick={() => { setFilterStatus(status); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${filterStatus === status ? 'text-teal-600 font-bold' : 'text-slate-700'}`}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}  
                placeholder="회사명, 직무, 태그 검색..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
            {isLoading && (
              <div className="text-center py-10 text-slate-400">
                데이터를 불러오는 중입니다...
              </div>
            )}
            {!isLoading && filteredJobs.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                {searchQuery || filterStatus !== 'ALL' ? '검색 결과가 없습니다.' : '등록된 공고가 없습니다.'}
              </div>
            )}
            {filteredJobs.map(job => {
              const isLoadingRoute = loadingRoutes.has(job.id);
              const isSelected = selectedIds.has(job.id);
              const colors = STATUS_COLORS[job.status];
              return (
                <div
                  key={job.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(job.id);
                    } else {
                      setSelectedJobId(selectedJobId === job.id ? null : job.id);
                    }
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 group relative ${
                    selectedJobId === job.id && !isSelectionMode ? 'bg-white border-teal-500 ring-2 ring-teal-50 shadow-md' : 'bg-white border-slate-200 hover:border-teal-300'
                  } ${isSelected ? 'ring-2 ring-teal-500' : ''}`}
                >
                  {isSelectionMode && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300'
                      }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <div className="font-bold text-slate-800 truncate pr-2 flex items-center gap-2">
                      {job.company}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${colors.bg} ${colors.text} ${colors.border}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mb-3 font-medium line-clamp-2 leading-relaxed">
                    {getJobRole(job)}
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

        {selectedJob && (
          <div className="w-[500px] h-full bg-white shadow-lg z-10 overflow-y-auto border-l border-r border-slate-200 shrink-0">
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
                  {getJobRole(selectedJob)}
                </h1>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <span>{selectedJob.company}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin size={14} /> {getShortLocation(selectedJob.location)}
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedJob.status}
                      onChange={(e) => handleStatusChange(selectedJob.id, e.target.value as JobStatus)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        STATUS_COLORS[selectedJob.status].bg
                      } ${STATUS_COLORS[selectedJob.status].text} ${STATUS_COLORS[selectedJob.status].border}`}
                    >
                      {(Object.keys(STATUS_LABELS) as JobStatus[]).map(status => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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
                {selectedJob.rawJson ? (
                  <DynamicJobDetail
                    rawJson={selectedJob.rawJson}
                    companyName={selectedJob.company}
                  />
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    상세 정보를 불러올 수 없습니다.
                  </div>
                )}
                <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-sm border-t border-slate-100 mt-8">
                  <button
                    onClick={() => setIsScreenshotOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                  >
                    <Maximize2 size={16} /> 원문 보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {isScreenshotOpen && selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-10 animate-fade-in cursor-pointer"
          onClick={() => setIsScreenshotOpen(false)}
        >
          <div
            className="bg-white w-[800px] h-[90%] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-slide-up cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  {selectedJob.company} <span className="text-slate-300">|</span> {getJobRole(selectedJob)}
                </h3>
                <a
                  href={selectedJob.detail?.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-1 hover:underline"
                >
                  {selectedJob.detail?.originalUrl} <ExternalLink size={10} />
                </a>
              </div>
              <button
                onClick={() => setIsScreenshotOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                title="닫기 (Esc)"
              >
                <X size={28} className="text-slate-400 group-hover:text-slate-700" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
              {selectedJob.detail?.screenshot ? (
                <img src={`data:image/jpeg;base64,${selectedJob.detail.screenshot}`} alt="Original Capture" className="w-full h-auto rounded shadow-sm" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <p>저장된 스크린샷이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showHomeSettings && (
        <HomeLocationSettings
          onClose={() => setShowHomeSettings(false)}
          onSave={handleSaveHomeLocation}
        />
      )}
    </div>
  );
}
