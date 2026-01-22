import { useState, useEffect } from 'react';
import { Search, AlertCircle, Loader2, Building2, Eye, EyeOff } from 'lucide-react';
import type { CompanyResearchResponse, ResearchStatus } from '../../types';

interface CompanyResearchProps {
  jobId: number;
  companyName: string;
  onStatusChange?: (status: ResearchStatus) => void;
  onDataLoaded?: (data: any) => void;
  onToggleView?: (show: boolean) => void;
}

export function CompanyResearch({ 
  jobId, 
  companyName, 
  onStatusChange, 
  onDataLoaded,
  onToggleView 
}: CompanyResearchProps) {
  const [status, setStatus] = useState<ResearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isViewingResult, setIsViewingResult] = useState(false);

  // jobId 변경 시 상태 리셋
  useEffect(() => {
    setIsViewingResult(false);
    setStatus('idle');
    setError(null);
    setHasExistingData(false);
  }, [jobId]);

  useEffect(() => {
    checkExistingResearch();
  }, [jobId]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  useEffect(() => {
    if (onToggleView) {
      onToggleView(isViewingResult);
    }
  }, [isViewingResult, onToggleView]);

  const checkExistingResearch = async () => {
    try {
      const response = await fetch(`/api/company/research?jobId=${jobId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data: CompanyResearchResponse = await response.json();
        if (data.success && data.exists && data.data) {
          setHasExistingData(true);
          const parsedData = typeof data.data.companySearchResult === 'string'
            ? JSON.parse(data.data.companySearchResult)
            : data.data.companySearchResult;
          
          if (onDataLoaded) {
            onDataLoaded(parsedData);
          }
        } else {
          // 데이터가 없으면 state 클리어
          setHasExistingData(false);
          if (onDataLoaded) {
            onDataLoaded(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to check existing research:', err);
      // 에러 시에도 state 클리어
      setHasExistingData(false);
      if (onDataLoaded) {
        onDataLoaded(null);
      }
    }
  };

  const startResearch = async () => {
    setStatus('searching');
    setError(null);
    
    try {
      const response = await fetch(`/api/company/research?jobId=${jobId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Research failed');
      }
      
      const data: CompanyResearchResponse = await response.json();
      
      if (data.success && data.data) {
        const parsedData = typeof data.data.companySearchResult === 'string'
          ? JSON.parse(data.data.companySearchResult)
          : data.data.companySearchResult;
        
        if (onDataLoaded) {
          onDataLoaded(parsedData);
        }
        
        setStatus('completed');
        setHasExistingData(true);
        setIsViewingResult(true);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
      
    } catch (err) {
      console.error('Research error:', err);
      setError(err instanceof Error ? err.message : 'Research failed');
      setStatus('error');
    }
  };

  const toggleResultView = () => {
    setIsViewingResult(!isViewingResult);
  };

  const isLoading = status === 'searching' || status === 'crawling' || status === 'analyzing';

  return (
    <div className="border-t border-slate-100 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-slate-600" />
          <h3 className="font-bold text-slate-800">회사 조사</h3>
        </div>
      </div>

      {!hasExistingData && status === 'idle' && (
        <button
          onClick={startResearch}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Search size={16} />
          회사 조사 시작
        </button>
      )}

      {isLoading && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="text-teal-600 animate-spin" />
            <div>
              <p className="font-bold text-teal-700">회사 조사 진행 중</p>
              <p className="text-xs text-teal-600 mt-0.5">홈페이지 크롤링 및 AI 분석 중입니다 (30초~1분 소요)</p>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-700 mb-1">조사 실패</p>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={startResearch}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}

      {hasExistingData && status === 'completed' && (
        <button
          onClick={toggleResultView}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
            isViewingResult
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          {isViewingResult ? (
            <>
              <EyeOff size={16} />
              결과 닫기
            </>
          ) : (
            <>
              <Eye size={16} />
              결과 보기
            </>
          )}
        </button>
      )}

      {hasExistingData && status !== 'completed' && !isLoading && (
        <button
          onClick={toggleResultView}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Eye size={16} />
          결과 보기
        </button>
      )}
    </div>
  );
}
