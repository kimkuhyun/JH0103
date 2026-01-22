import { Building2, ExternalLink, TrendingUp, Users, Briefcase, Calendar, Tag } from 'lucide-react';

interface DynamicCompanyDetailProps {
  data: any;
  companyName: string;
}

const renderValue = (value: any, depth: number = 0): JSX.Element | null => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 text-sm">정보 없음</span>;
  }

  if (typeof value === 'string') {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1 hover:underline"
        >
          {value}
          <ExternalLink size={12} />
        </a>
      );
    }
    return <span className="text-slate-700 text-sm leading-relaxed">{value}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-slate-700 text-sm font-medium">{value.toLocaleString()}</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-slate-700 text-sm">{value ? '예' : '아니오'}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-400 text-sm">정보 없음</span>;
    }
    
    if (value.every(item => typeof item === 'string')) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, idx) => (
            <span 
              key={idx} 
              className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium border border-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, idx) => (
          <div key={idx} className="pl-3 border-l-2 border-slate-200">
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-slate-400 text-sm">정보 없음</span>;
    }

    return (
      <div className={depth === 0 ? "space-y-3" : "space-y-2"}>
        {entries.map(([key, val]) => (
          <div key={key} className={depth === 0 ? "" : "pl-3"}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              {formatFieldName(key)}
            </div>
            {renderValue(val, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const formatFieldName = (key: string): string => {
  const formatted = key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const koreanMapping: Record<string, string> = {
    'Company Name': '회사명',
    'Industry': '업종',
    'Business Summary': '사업 내용',
    'Key Products': '주요 제품/서비스',
    'Company Culture': '기업 문화',
    'Recent News Summary': '최근 뉴스',
    'Job Fit Analysis': '직무 적합성',
    'Search Results': '검색 결과',
    'News Results': '뉴스',
    'Crawled Pages': '크롤링 페이지',
    'Raw Analysis': 'AI 분석',
    'Error': '오류',
  };

  return koreanMapping[formatted] || formatted;
};

const getIconForField = (key: string) => {
  const iconMap: Record<string, JSX.Element> = {
    'company_name': <Building2 size={16} className="text-teal-600" />,
    'industry': <Briefcase size={16} className="text-slate-500" />,
    'business_summary': <TrendingUp size={16} className="text-blue-500" />,
    'key_products': <Tag size={16} className="text-purple-500" />,
    'company_culture': <Users size={16} className="text-orange-500" />,
    'recent_news_summary': <Calendar size={16} className="text-green-500" />,
    'job_fit_analysis': <Briefcase size={16} className="text-teal-600" />,
  };
  
  return iconMap[key] || null;
};

export function DynamicCompanyDetail({ data, companyName }: DynamicCompanyDetailProps) {
  if (!data) {
    return (
      <div className="text-center py-8 text-slate-400">
        회사 조사 데이터가 없습니다.
      </div>
    );
  }

  const mainFields = ['company_name', 'industry', 'business_summary', 'key_products', 'company_culture', 'recent_news_summary', 'job_fit_analysis'];
  const otherFields = Object.keys(data).filter(key => !mainFields.includes(key) && !key.startsWith('_'));

  return (
    <div className="space-y-4">
      {mainFields.map(fieldKey => {
        if (!data[fieldKey]) return null;
        
        const icon = getIconForField(fieldKey);
        
        return (
          <div key={fieldKey} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              {icon}
              <h3 className="font-bold text-slate-800">
                {formatFieldName(fieldKey)}
              </h3>
            </div>
            <div className="pl-6">
              {renderValue(data[fieldKey])}
            </div>
          </div>
        );
      })}

      {otherFields.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-700 mb-3">추가 정보</h3>
          <div className="space-y-3">
            {otherFields.map(fieldKey => (
              <div key={fieldKey}>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  {formatFieldName(fieldKey)}
                </div>
                {renderValue(data[fieldKey])}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
            <span>분석 정보</span>
          </div>
          <p className="text-sm text-amber-600">{data.error}</p>
        </div>
      )}
    </div>
  );
}
