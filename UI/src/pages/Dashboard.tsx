import { useState, useRef } from 'react';
import type { Job } from '../types/index';
import { MOCK_JOBS } from '../mockdata/mockData';
import { KakaoMapContainer } from '../components/map/KakaoMapContainer';
import { Plus, Filter, Clock, Navigation, MapPin, X, ExternalLink, Briefcase, Code2, Building2 } from 'lucide-react';
import { parseJsonToJob } from '../utils/jobParser'; // 앞서 만든 파서 유틸리티 Import

export function Dashboard() {
  // 공고 데이터 상태 관리
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // 파일 입력 요소 참조
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // 파일 업로드 및 파싱 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        // 유틸리티 함수로 JSON을 Job 객체로 변환 (비동기 처리)
        const newJob = await parseJsonToJob(jsonContent);
        
        // 새 공고를 리스트 최상단에 추가
        setJobs(prev => [newJob, ...prev]);
        // 추가된 공고를 즉시 선택하여 상세 화면 표시
        setSelectedJobId(newJob.id);
        
        alert(`[${newJob.company}] 공고가 추가되었습니다.`);
      } catch (error) {
        console.error("JSON 파싱 또는 주소 변환 에러:", error);
        alert("지원하지 않는 형식이거나 잘못된 JSON 파일입니다.");
      }
    };
    reader.readAsText(file);
    // 동일 파일 재선택 가능하도록 초기화
    event.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. 헤더 (Header)
      ───────────────────────────────────────────────────────────── */}
      <header className="h-[72px] border-b border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white z-20 relative">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Briefcase className="text-teal-600" /> 채용 공고 관리
        </h2>
        
        {/* 파일 업로드 버튼 */}
        <div>
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

      {/* ─────────────────────────────────────────────────────────────
          2. 메인 콘텐츠 (Split View: List + Details + Map)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* [왼쪽] 공고 리스트 사이드바 */}
        <div className="w-[400px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] shrink-0">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <span className="font-bold text-slate-700">총 <span className="text-teal-600">{jobs.length}</span>건</span>
            <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded transition-colors">
              <Filter size={14} /> 필터
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
            {jobs.map(job => (
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
                    <Navigation size={12} className="text-teal-500"/> {job.commuteTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* [중간] 상세 정보 패널 */}
        {selectedJob && (
          <div className="w-[450px] h-full bg-white shadow-lg z-10 overflow-y-auto border-l border-r border-slate-200 shrink-0">
            <div className="min-h-full pb-10">
              {/* 패널 헤더 */}
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

              {/* 상세 내용 컨텐츠 */}
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
                      job.tags?.map((tag, idx) => (
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

        {/* [오른쪽] 지도 */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          <KakaoMapContainer 
            jobs={jobs} 
            selectedJobId={selectedJobId} 
            onSelectJob={setSelectedJobId} 
            fullScreen={true} 
          />
        </div>
      </div>
    </div>
  );
}