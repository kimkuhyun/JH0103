import { useState } from 'react';
import type{ Job } from '../types/index.ts';
import { Job } from '../types/index.ts';
import { MOCK_JOBS } from '../mockdata/mockData';
import { KakaoMapContainer } from '../components/map/KakaoMapContainer';
import { Plus, Filter, Clock, Navigation, MapPin } from 'lucide-react';

export function Dashboard() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const jobs: Job[] = MOCK_JOBS; // 추후 API 데이터로 교체

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <header className="h-[72px] border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">채용 공고 관리</h2>
        <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all">
          <Plus className="w-4 h-4" />공고 추가
        </button>
      </header>

      {/* 메인 콘텐츠 영역 (리스트 + 지도 Split View) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 왼쪽: 공고 리스트 */}
        <div className="w-[400px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
            <span className="font-bold text-slate-700">총 <span className="text-teal-600">{jobs.length}</span>건</span>
            <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded">
              <Filter size={14} /> 필터
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
            {jobs.map(job => (
              <div 
                key={job.id} 
                onClick={() => setSelectedJobId(job.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  selectedJobId === job.id 
                    ? 'bg-white border-teal-500 ring-2 ring-teal-50/50 shadow-md' 
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between mb-2">
                  <div className="font-bold text-slate-800 truncate pr-2">{job.company}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-500 whitespace-nowrap">
                    {job.status}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mb-3 font-medium">{job.role}</div>
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-50">
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

        {/* 오른쪽: 지도 및 상세 정보 */}
        <div className="flex-1 relative bg-slate-100">
          <KakaoMapContainer jobs={jobs} selectedJobId={selectedJobId} onSelectJob={setSelectedJobId} />
          
          {/* 하단 상세 카드 (선택 시 등장) */}
          {selectedJob && (
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-2xl z-20 max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                      {selectedJob.company}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={12}/> {selectedJob.location}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedJob.role}</h2>
                </div>
                <button className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-200 transition-all">
                  상세 보기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}