// CareerOS Background Service Worker - One-Click Capture System

const STORAGE_KEYS = { 
    JOBS: 'analysisJobs',
    SETTINGS: 'settings'
};

const API_ENDPOINT = 'http://localhost:5000/analyze';

// 단축키 리스너
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'one-click-capture') {
        await startOneClickCapture();
    }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_CAPTURE') {
        startOneClickCapture();
    }
});

// 익스텐션 아이콘 클릭 시에도 동작 (팝업 대신)
chrome.action.onClicked.addListener(async (tab) => {
    await startOneClickCapture();
});

// === 메인 원클릭 캡처 함수 ===
async function startOneClickCapture() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;
    
    const tab = tabs[0];
    const tabId = tab.id;
    
    try {
        // 1. 토스트 표시 (주의사항 포함)
        await showToast(tabId, '캡처 시작! 완료될 때까지 이 탭에서 대기해주세요', 'capture');
        
        // Content script에 준비 요청
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('페이지 준비 실패');
        }
        
        const { metadata, pageInfo } = prepareResult;
        
        // 2. 스크린샷 캡처 (스크롤 캡처)
        await showToast(tabId, '페이지 캡처중... 탭을 유지해주세요', 'capture');
        const images = await captureFullPage(tabId, pageInfo);
        
        // 3. AI 분석 시작 (이제 탭 이동 가능)
        await showToast(tabId, 'AI 분석중... 이제 다른 작업 가능합니다', 'analyzing');
        
        // 작업 생성
        const job = {
            id: Date.now(),
            title: tab.title.substring(0, 30),
            url: tab.url,
            status: 'PROCESSING',
            metadata: metadata,
            images: images
        };
        
        await saveJob(job);
        
        // 4. 서버로 전송 및 분석
        const result = await sendToServer(job);
        
        // 5. 완료 표시
        if (result.success) {
            await showToast(tabId, '공고 분석 완료!', 'complete');
            await updateJobStatus(job.id, 'COMPLETED');
        } else {
            throw new Error(result.message || '분석 실패');
        }
        
        // 6. 3초 후 토스트 숨기기
        setTimeout(async () => {
            await hideToast(tabId);
        }, 3000);
        
    } catch (error) {
        console.error('Capture error:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        setTimeout(async () => {
            await hideToast(tabId);
        }, 3000);
    }
}

// === 전체 페이지 캡처 (스크롤) ===
async function captureFullPage(tabId, pageInfo) {
    const images = [];
    const { totalHeight, viewportHeight } = pageInfo;
    
    // 최대 캡처 횟수 제한 (너무 긴 페이지 방지)
    const maxCaptures = Math.min(Math.ceil(totalHeight / viewportHeight), 5);
    
    // 페이지 맨 위로 스크롤
    await chrome.tabs.sendMessage(tabId, { action: 'SCROLL_TO', position: 0 });
    await sleep(300);
    
    for (let i = 0; i < maxCaptures; i++) {
        const scrollPosition = i * viewportHeight;
        
        // 스크롤 이동
        await chrome.tabs.sendMessage(tabId, { 
            action: 'SCROLL_TO', 
            position: scrollPosition 
        });
        await sleep(400); // 렌더링 대기
        
        // 캡처
        try {
            const tab = await chrome.tabs.get(tabId);
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { 
                format: 'png' 
            });
            images.push(dataUrl.split(',')[1]); // base64 부분만
        } catch (e) {
            console.error('Capture failed at position:', scrollPosition, e);
        }
    }
    
    // 원래 위치로 복원
    await chrome.tabs.sendMessage(tabId, { 
        action: 'SCROLL_TO', 
        position: pageInfo.scrollY 
    });
    
    return images;
}

// === 서버 전송 ===
async function sendToServer(job) {
    const today = new Date().toISOString().split('T')[0];
    
    // 메타데이터가 있으면 프롬프트에 추가
    let metadataHint = '';
    if (job.metadata) {
        const m = job.metadata;
        if (m.company) metadataHint += `회사명: ${m.company}\n`;
        if (m.title) metadataHint += `공고제목: ${m.title}\n`;
        if (m.salary) metadataHint += `급여정보: ${m.salary}\n`;
        if (m.location) metadataHint += `근무지: ${m.location}\n`;
        if (m.deadline) metadataHint += `마감일: ${m.deadline}\n`;
    }
    
    const prompt = `
[Role] 전문 채용공고 분석가
[Task] 이미지에서 채용공고 정보를 빠짐없이 추출하여 JSON으로 구조화

${metadataHint ? `[참고 메타데이터]\n${metadataHint}\n` : ''}

[Critical Rules - 반드시 준수]

1. **산업 분류 (industry_domain)**
   - 회사의 실제 사업 분야로 분류 (공고 직무가 아님)
   - 예: 가구 철물 회사의 영업직 → "제조/가구", IT회사 경리 → "IT"
   - 분류: IT/소프트웨어, 금융, 제조, 유통/물류, 서비스, 의료/제약, 교육, 건설, 디자인, 미디어/광고

2. **마감일 (deadline)**
   - deadline_date: 반드시 YYYY-MM-DD 형식 (예: 2026-01-21)
   - 이미지에서 "마감일", "접수기간", "~까지" 등을 찾아 정확한 날짜 추출
   - 날짜가 없으면 null

3. **급여 (salary)**
   - "채용 보상금", "입사 축하금", "추천 보상금"은 급여가 아님 - 제외
   - 연봉/월급 정보만 기재, 없으면 "회사 내규에 따름"

4. **근무지 주소 (location.address)**
   - 우편번호 제외 (06105 같은 숫자 제외)
   - 도로명 주소만 기재 (예: "서울 강남구 연주로129길 13")
   - 지하철역 정보는 notes에 기재

5. **복리후생 (benefits)** - 반드시 포함
   - 이미지에서 "복리후생", "혜택", "지원" 섹션 찾아서 모두 추출
   - 예: 유연근무제, 재택근무, 식대, 복지카드, 건강검진, 자녀학자금, 경조휴가 등

6. **전형절차 (hiring_process)**
   - 서류전형 → 면접 → 최종합격 등 단계별로 배열

7. **주요업무 (key_responsibilities)**
   - 구체적으로 작성 (예: "영업지원 업무 전반", "수/발주 업무", "세금계산서 관리")

8. **자격요건과 우대사항 구분**
   - essential_qualifications: 필수 조건만
   - preferred_qualifications: 우대 사항만 (SAP 경험, 관련 자격증 등)

9. **수습기간**
   - probation_period 필드에 기재 (예: "3개월")

[Output JSON Schema]
{
  "meta": {
    "url": "${job.url}",
    "captured_at": "${today}",
    "industry_domain": "회사의 실제 산업 분야"
  },
  "timeline": {
    "deadline_date": "YYYY-MM-DD 또는 null",
    "deadline_text": "마감일 원본 텍스트"
  },
  "job_summary": {
    "company": "회사명 (주식회사, ㈜ 등 포함)",
    "title": "공고 제목",
    "employment_type": "정규직/계약직/인턴/아르바이트/프리랜서",
    "probation_period": "수습기간 (없으면 null)",
    "experience_required": "경력 요구사항 (예: 2년 이상, 신입)"
  },
  "analysis": {
    "key_responsibilities": ["구체적인 업무 내용 1", "업무 2", "업무 3"],
    "essential_qualifications": ["필수 자격요건"],
    "preferred_qualifications": ["우대 사항"],
    "core_competencies": ["필요 역량 (Soft Skills)"],
    "tools_and_knowledge": ["필요 기술/도구 (Hard Skills)"],
    "hiring_process": ["서류전형", "1차면접", "2차면접", "최종합격"],
    "working_conditions": {
      "salary": "급여 정보 (보상금 제외)",
      "location": {
        "address": "도로명 주소 (우편번호 제외)",
        "notes": "교통편, 추가 위치 정보"
      },
      "schedule": {
        "work_hours": "근무 시간",
        "work_days": "근무 요일",
        "notes": "유연근무제, 교대근무 여부 등"
      }
    },
    "benefits": ["복리후생 항목 1", "항목 2", "항목 3"]
  }
}

[Important] 이미지에 있는 모든 정보를 빠짐없이 추출하세요. 특히 복리후생, 전형절차, 마감일을 놓치지 마세요.`;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: job.url,
                images: job.images,
                metadata: job.metadata,
                prompt: prompt
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, message: errorText };
        }
        
        const result = await response.json();
        return { success: true, data: result };
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// === 유틸리티 함수들 ===

async function showToast(tabId, message, type) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'SHOW_TOAST',
            message: message,
            type: type
        });
    } catch (e) {
        console.log('Toast error:', e);
    }
}

async function hideToast(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'HIDE_TOAST' });
    } catch (e) {
        console.log('Hide toast error:', e);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveJob(job) {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    const jobs = result[STORAGE_KEYS.JOBS] || [];
    jobs.unshift(job);
    // 최대 20개만 유지
    if (jobs.length > 20) jobs.pop();
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });
}

async function updateJobStatus(jobId, status) {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    const jobs = result[STORAGE_KEYS.JOBS] || [];
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
        jobs[idx].status = status;
        await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });
    }
}
