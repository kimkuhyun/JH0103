import type { JobJsonV2 } from '../../types/index';
import { Briefcase, Code2, Award, DollarSign, Clock, Building2, Users, Calendar, MapPin, TrendingUp } from 'lucide-react';

interface DynamicJobDetailProps {
  rawJson: JobJsonV2;
  companyName: string;
}

/**
 * 동적으로 JSON 구조를 파싱하여 공고 상세 정보를 렌더링하는 컴포넌트
 * 다양한 JSON 구조를 지원 (포지션 여러 개, 복리후생, 전형절차 등)
 * 
 * 색상 팔레트: teal(메인), emerald(긍정), slate(중립), amber(중요)
 */
export function DynamicJobDetail({ rawJson, companyName }: DynamicJobDetailProps) {
  // 회사 정보 추출
  const companyInfo = rawJson.company_info;
  const positions = rawJson.positions || [];
  const benefits = rawJson.benefits || [];
  const hiringProcess = rawJson.hiring_process || [];
  const culture = rawJson.culture;
  
  // 섹션 렌더링 헬퍼
  const renderSection = (
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    show: boolean = true
  ) => {
    if (!show) return null;
    
    return (
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
          {icon}
          {title}
        </h3>
        {content}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* 회사 정보 (메타정보) */}
      {companyInfo && companyInfo.description && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 mb-1">{companyName}</h4>
              {companyInfo.business_type && (
                <p className="text-xs text-slate-500 mb-2">{companyInfo.business_type}</p>
              )}
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {companyInfo.description}
              </p>
            </div>
          </div>
          
          {(companyInfo.employee_count || companyInfo.established || companyInfo.location) && (
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-200">
              {companyInfo.employee_count && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users size={14} />
                  <span>{companyInfo.employee_count}</span>
                </div>
              )}
              {companyInfo.established && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={14} />
                  <span>설립 {companyInfo.established}</span>
                </div>
              )}
              {companyInfo.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={14} />
                  <span>{companyInfo.location}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* 포지션 정보 (여러 개 지원) */}
      {positions.length > 0 && (
        <div className="space-y-4">
          {positions.map((position, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4">
              {/* 포지션 헤더 */}
              <div className="mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 mb-2">
                  {position.title || `포지션 ${idx + 1}`}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {position.employment_type && (
                    <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md border border-teal-100 font-medium">
                      {position.employment_type}
                    </span>
                  )}
                  {position.experience_required && (
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-medium">
                      {position.experience_required}
                    </span>
                  )}
                  {position.headcount && (
                    <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 font-medium">
                      {position.headcount}
                    </span>
                  )}
                </div>
              </div>
              
              {/* 주요 업무 */}
              {position.responsibilities && position.responsibilities.length > 0 && renderSection(
                "주요 업무",
                <Briefcase size={16} className="text-teal-600" />,
                <ul className="space-y-2">
                  {position.responsibilities.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                      <span className="text-teal-500 mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 필수 자격 */}
              {position.essential_qualifications && position.essential_qualifications.length > 0 && renderSection(
                "필수 자격",
                <Award size={16} className="text-amber-600" />,
                <ul className="space-y-2">
                  {position.essential_qualifications.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                      <span className="text-amber-500 mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 우대 사항 */}
              {position.preferred_qualifications && position.preferred_qualifications.length > 0 && renderSection(
                "우대 사항",
                <TrendingUp size={16} className="text-emerald-600" />,
                <ul className="space-y-2">
                  {position.preferred_qualifications.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                      <span className="text-emerald-500 mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 기술 스택 */}
              {position.tech_stack && position.tech_stack.length > 0 && renderSection(
                "기술 스택",
                <Code2 size={16} className="text-teal-600" />,
                <div className="flex flex-wrap gap-2">
                  {position.tech_stack.map((tech, i) => (
                    <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg border border-teal-100">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 도구 */}
              {position.tools && position.tools.length > 0 && renderSection(
                "사용 도구",
                <Code2 size={16} className="text-slate-600" />,
                <div className="flex flex-wrap gap-2">
                  {position.tools.map((tool, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200">
                      {tool}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 급여 정보 */}
              {position.salary && position.salary.amount && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 mt-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-1">
                    <DollarSign size={16} />
                    {position.salary.type || "급여"}
                  </div>
                  <div className="text-sm text-slate-700 font-medium">{position.salary.amount}</div>
                  {position.salary.details && (
                    <div className="text-xs text-slate-500 mt-1">{position.salary.details}</div>
                  )}
                </div>
              )}
              
              {/* 근무 조건 */}
              {position.working_conditions && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mt-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Clock size={16} />
                    근무 조건
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    {position.working_conditions.work_hours && (
                      <div>근무 시간: {position.working_conditions.work_hours}</div>
                    )}
                    {position.working_conditions.work_type && (
                      <div>근무 형태: {position.working_conditions.work_type}</div>
                    )}
                    {position.working_conditions.location && (
                      <div>근무지: {position.working_conditions.location}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* 전형 절차 */}
      {hiringProcess.length > 0 && (
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
          <h3 className="flex items-center gap-2 text-sm font-bold text-teal-800 mb-3">
            <Calendar size={16} />
            전형 절차
          </h3>
          <div className="flex flex-wrap gap-2">
            {hiringProcess.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-white text-teal-700 text-xs font-medium rounded-lg border border-teal-200">
                  {idx + 1}. {step}
                </span>
                {idx < hiringProcess.length - 1 && (
                  <span className="text-teal-300">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 복리후생 */}
      {benefits.length > 0 && (
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 mb-3">
            <Award size={16} />
            복리후생
          </h3>
          <div className="flex flex-wrap gap-2">
            {benefits.map((benefit, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-white text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200">
                {benefit}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* 기업 문화 */}
      {culture && (culture.keywords || culture.description) && (
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
          <h3 className="flex items-center gap-2 text-sm font-bold text-teal-800 mb-3">
            <Users size={16} />
            기업 문화
          </h3>
          {culture.keywords && culture.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {culture.keywords.map((keyword, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-white text-teal-700 text-xs font-medium rounded-lg border border-teal-200">
                  #{keyword}
                </span>
              ))}
            </div>
          )}
          {culture.description && (
            <p className="text-sm text-slate-600 leading-relaxed mt-2">
              {culture.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
