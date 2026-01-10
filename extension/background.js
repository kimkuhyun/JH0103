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
        // 1. 토스트 표시 및 페이지 준비
        await showToast(tabId, '캡처되었습니다', 'capture');
        
        // Content script에 준비 요청
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('페이지 준비 실패');
        }
        
        const { metadata, pageInfo } = prepareResult;
        
        // 2. 스크린샷 캡처 (스크롤 캡처)
        await showToast(tabId, '페이지 캡처중...', 'capture');
        const images = await captureFullPage(tabId, pageInfo);
        
        // 3. AI 분석 시작
        await showToast(tabId, 'AI가 분석중...', 'analyzing');
        
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
[Task] 이미지 분석 후 구조화된 JSON 추출.

${metadataHint ? `[참고 메타데이터]\n${metadataHint}\n` : ''}

[Strict Rules - 반드시 지킬 것]
1. **Industry Domain(산업 분야):** 공고 내용을 바탕으로 [IT, 금융, 제조, 서비스, 의료, 교육, 건설, 디자인, 영업] 등 가장 적합한 대분류를 추론하여 적으세요.
2. **Salary(급여):** '채용 보상금', '입사 축하금' 등 일회성 보상은 연봉이 아닙니다. 연봉/월급 정보가 명시되지 않았다면 "회사 내규에 따라 협의"라고 적으세요.
3. **Employment Type(고용 형태):** '3~6년' 같은 경력 연수는 고용 형태가 아닙니다. 반드시 [정규직, 계약직, 인턴, 아르바이트, 프리랜서] 중 하나로 분류하세요.
4. **Tools & Knowledge (Hard Skills):** 해당 직무 수행에 필요한 **소프트웨어, 장비, 자격증, 전문 지식**을 모두 포함하세요.
5. **Language:** 모든 텍스트 값은 한국어로 번역 및 요약하세요.

[Target JSON Schema]
{
  "meta": { 
    "url": "${job.url}", 
    "captured_at": "${today}", 
    "industry_domain": "공고 내용을 분석하여 분류" 
  },
  "timeline": { 
    "deadline_date": "YYYY-MM-DD (날짜가 없으면 null)", 
    "deadline_text": "원본 텍스트" 
  },
  "job_summary": { 
    "company": "회사명", 
    "title": "공고 제목", 
    "employment_type": "고용 형태" 
  },
  "analysis": {
    "key_responsibilities": ["핵심 업무 요약"], 
    "essential_qualifications": ["필수 자격 요건"], 
    "preferred_qualifications": ["우대 사항"],
    "core_competencies": ["핵심 역량 (Soft Skills)"], 
    "tools_and_knowledge": ["사용 도구 및 기술 (Hard Skills)"],
    "working_conditions": { 
      "salary": "급여 정보", 
      "location": { "address": "근무지 주소", "notes": "위치 관련 비고" }, 
      "schedule": { "work_hours": "근무 시간", "notes": "교대근무 여부 등" } 
    }
  }
}`;

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
