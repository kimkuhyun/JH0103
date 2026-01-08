// 상태 관리 키
const STORAGE_KEYS = { IS_CAPTURING: 'isCapturing', IMAGES: 'capturedImages', JOBS: 'analysisJobs' };

// 1. 단축키 리스너
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-capture") {
        await toggleCapture();
    } else if (command === "take-snapshot") {
        await takeSnapshot();
    } else if (command === "finish-analysis") {
        await finishAnalysis();
    }
});

// 2. 메시지 리스너 (팝업이나 기타 요청 처리)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "PROCESS_JOBS") {
        processNextJob();
    }
});

// --- 기능 함수들 ---

async function toggleCapture() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.IS_CAPTURING]);
    const newState = !result[STORAGE_KEYS.IS_CAPTURING];
    
    await chrome.storage.local.set({ 
        [STORAGE_KEYS.IS_CAPTURING]: newState,
        [STORAGE_KEYS.IMAGES]: newState ? [] : (await chrome.storage.local.get([STORAGE_KEYS.IMAGES]))[STORAGE_KEYS.IMAGES]
    });

    updateBadge(newState);
}

async function takeSnapshot() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.IS_CAPTURING, STORAGE_KEYS.IMAGES]);
    if (!result[STORAGE_KEYS.IS_CAPTURING]) {
        // 캡처 모드가 아니면 자동으로 켬
        await toggleCapture(); 
    }

    // 현재 탭 캡처 (원본 그대로 저장 -> 파이썬이 리사이징함)
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs.length === 0) return;

    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {format: "png"});
        const images = result[STORAGE_KEYS.IMAGES] || [];
        images.push(dataUrl);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMAGES]: images });
        
        // 시각적 피드백 (배지에 찍은 장수 표시)
        updateBadge(true, images.length);
    } catch (e) {
        console.error("캡처 실패:", e);
    }
}

async function finishAnalysis() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.IMAGES]);
    const images = result[STORAGE_KEYS.IMAGES] || [];
    if (images.length === 0) return;

    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 작업 큐에 추가
    const newJob = {
        id: Date.now(),
        title: tabs[0].title.substring(0, 20) + "...",
        url: tabs[0].url,
        status: 'PENDING',
        images: images
    };

    const jobsResult = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    const jobs = jobsResult[STORAGE_KEYS.JOBS] || [];
    jobs.unshift(newJob);
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });

    // 상태 초기화 및 분석 시작
    await chrome.storage.local.set({ [STORAGE_KEYS.IS_CAPTURING]: false, [STORAGE_KEYS.IMAGES]: [] });
    updateBadge(false);
    processNextJob();
}

// 아이콘 배지 업데이트 (경험 개선 핵심 ⭐)
function updateBadge(isCapturing, count = 0) {
    if (isCapturing) {
        const text = count > 0 ? `${count}` : "ON";
        chrome.action.setBadgeText({ text: text });
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" }); // 초록색
    } else {
        chrome.action.setBadgeText({ text: "" }); // 끄기
    }
}


// --- 분석 처리 로직 (파이썬 서버 전송) ---

async function processNextJob() {
    // 최신 상태 가져오기
    let result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    let jobs = result[STORAGE_KEYS.JOBS] || []; // 키 이름 주의 (변수명 수정)
    
    const jobIndex = jobs.findIndex(j => j.status === 'PENDING');
    if (jobIndex === -1) return;

    // 처리중 상태 변경
    jobs[jobIndex].status = 'PROCESSING';
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });

    const job = jobs[jobIndex];

    try {
        const cleanImages = job.images.map(img => img.split(',')[1]);
        const today = new Date().toISOString().split('T')[0];

        // API 요청
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: job.url,
                images: cleanImages,
                prompt: `
[Role] 전문 채용공고 분석가 
[Task] 이미지 분석 후 구조화된 JSON 추출.

[Strict Rules - 반드시 지킬 것]
1. **Industry Domain(산업 분야):** 공고 내용을 바탕으로 [IT, 금융, 제조, 서비스, 의료, 교육, 건설, 디자인, 영업] 등 가장 적합한 대분류를 추론하여 적으세요.
2. **Salary(급여):** '채용 보상금', '입사 축하금' 등 일회성 보상은 연봉이 아닙니다. 연봉/월급 정보가 명시되지 않았다면 "회사 내규에 따라 협의"라고 적으세요.
3. **Employment Type(고용 형태):** '3~6년' 같은 경력 연수는 고용 형태가 아닙니다. 반드시 [정규직, 계약직, 인턴, 아르바이트, 프리랜서] 중 하나로 분류하세요.
4. **Tools & Knowledge (Hard Skills):** 해당 직무 수행에 필요한 **소프트웨어, 장비, 자격증, 전문 지식**을 모두 포함하세요. (예: 포토샵, 지게차 운전, 간호사 면허, CAD, 운전면허, JAVA, SPRING BOOT등)
5. **Language:** 모든 텍스트 값은 한국어로 번역 및 요약하세요.

[Target JSON Schema]
{
  "meta": { 
    "url": "${job.url}", 
    "captured_at": "${today}", 
    "industry_domain": "공고 내용을 분석하여 분류 (예: IT, 디자인, 영업, 서비스 등)" 
  },
  "timeline": { 
    "deadline_date": "YYYY-MM-DD (날짜가 없으면 null)", 
    "deadline_text": "원본 텍스트 (예: 채용시 마감)" 
  },
  "job_summary": { 
    "company": "회사명", 
    "title": "공고 제목", 
    "employment_type": "고용 형태(Rule 3 참고)" 
  },
  "analysis": {
    "key_responsibilities": ["핵심 업무 요약"], 
    "essential_qualifications": ["필수 자격 요건"], 
    "preferred_qualifications": ["우대 사항"],
    "core_competencies": ["핵심 역량 (Soft Skills: 커뮤니케이션, 리더십, 꼼꼼함 등)"], 
    "tools_and_knowledge": ["사용 도구 및 기술 (Hard Skills: Python, Excel, CAD, 면허 등)"],
    "working_conditions": { 
      "salary": "급여 정보 (Rule 2 참고)", 
      "location": { "address": "근무지 주소", "notes": "위치 관련 비고" }, 
      "schedule": { "work_hours": "근무 시간 (복지 혜택 제외)", "notes": "교대근무 여부 등" } 
    }
  }
}`
            })
        });

        if (!response.ok) throw new Error("서버 오류");
        
        // 1단계: 성공(COMPLETED) 상태 표시 (UI에서 초록색으로 뜸)
        jobs = (await chrome.storage.local.get([STORAGE_KEYS.JOBS]))[STORAGE_KEYS.JOBS];
        const successIdx = jobs.findIndex(j => j.id === job.id);
        if (successIdx !== -1) {
            jobs[successIdx].status = 'COMPLETED';
            await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });

            // 2단계: 2초 대기 후 목록에서 자동 삭제 ✨
            setTimeout(async () => {
                const currentResult = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
                let currentJobs = currentResult[STORAGE_KEYS.JOBS] || [];
                // 해당 ID를 제외한 나머지로 덮어쓰기
                const newJobs = currentJobs.filter(j => j.id !== job.id);
                await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: newJobs });
            }, 2000); 
        }

    } catch (e) {
        console.error(e);
        jobs = (await chrome.storage.local.get([STORAGE_KEYS.JOBS]))[STORAGE_KEYS.JOBS];
        const failIdx = jobs.findIndex(j => j.id === job.id);
        if (failIdx !== -1) jobs[failIdx].status = 'FAILED';
        await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });
    }
}