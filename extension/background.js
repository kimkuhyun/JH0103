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
[Role] 채용공고 분석가
[Task] 이미지 분석 후 JSON 추출.
1. 모든 텍스트 값은 한국어로 요약/번역.
2. 없는 값은 null.
3. tools_and_knowledge 유추 포함.

[Target JSON Schema]
{
  "meta": { "url": "${job.url}", "captured_at": "${today}", "industry_domain": "IT" },
  "timeline": { "deadline_date": "YYYY-MM-DD", "deadline_text": "text" },
  "job_summary": { "company": "회사명", "title": "공고 제목", "employment_type": "형태" },
  "analysis": {
    "key_responsibilities": [], "essential_qualifications": [], "preferred_qualifications": [],
    "core_competencies": [], "tools_and_knowledge": [],
    "working_conditions": { "salary": "", "location": { "address": "", "notes": "" }, "schedule": { "work_hours": "", "notes": "" } }
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