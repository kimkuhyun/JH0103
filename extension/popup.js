const STORAGE_KEYS = { IS_CAPTURING: 'isCapturing', IMAGES: 'capturedImages', JOBS: 'analysisJobs' };

document.addEventListener('DOMContentLoaded', () => {
    restoreState();
    loadJobs();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes[STORAGE_KEYS.JOBS]) renderJobs(changes[STORAGE_KEYS.JOBS].newValue || []);
        if (changes[STORAGE_KEYS.IS_CAPTURING] || changes[STORAGE_KEYS.IMAGES]) restoreState();
    }
});

async function restoreState() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.IS_CAPTURING, STORAGE_KEYS.IMAGES]);
    updateUI(result[STORAGE_KEYS.IS_CAPTURING] || false, (result[STORAGE_KEYS.IMAGES] || []).length);
}

function updateUI(isCapturing, count) {
    const startBtn = document.getElementById('startBtn');
    const snapBtn = document.getElementById('snapBtn');
    const finishBtn = document.getElementById('finishBtn');
    const resetBtn = document.getElementById('resetBtn');
    const countBadge = document.getElementById('imgCount');

    if (isCapturing) {
        startBtn.style.display = 'none';
        snapBtn.style.display = 'block';
        finishBtn.style.display = 'block';
        resetBtn.style.display = 'block';
        countBadge.innerText = `${count}장`;
        countBadge.style.background = '#0052CC';
        countBadge.style.color = 'white';
        finishBtn.disabled = count === 0;
    } else {
        startBtn.style.display = 'block';
        snapBtn.style.display = 'none';
        finishBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        countBadge.innerText = '대기';
        countBadge.style.background = '#e2e8f0';
        countBadge.style.color = '#475569';
    }
}

// --- 버튼 핸들러 (이제 단순히 백그라운드 함수를 호출하는 셈) ---

document.getElementById('startBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.IS_CAPTURING]: true, [STORAGE_KEYS.IMAGES]: [] });
    chrome.action.setBadgeText({ text: "ON" }); 
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
});

document.getElementById('snapBtn').addEventListener('click', async () => {
    try {
        // 원본 캡처 (리사이징은 파이썬이 함)
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        
        const result = await chrome.storage.local.get([STORAGE_KEYS.IMAGES]);
        const images = result[STORAGE_KEYS.IMAGES] || [];
        images.push(dataUrl);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMAGES]: images });
        
        // 배지 숫자 업데이트
        chrome.action.setBadgeText({ text: `${images.length}` });

        const btn = document.getElementById('snapBtn');
        const originalText = btn.innerText;
        btn.innerText = "✅ 찰칵!";
        setTimeout(() => btn.innerText = originalText, 500);
    } catch (e) { alert("캡처 실패: " + e.message); }
});

document.getElementById('resetBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.IS_CAPTURING]: false, [STORAGE_KEYS.IMAGES]: [] });
    chrome.action.setBadgeText({ text: "" });
});

document.getElementById('finishBtn').addEventListener('click', async () => {
    const result = await chrome.storage.local.get([STORAGE_KEYS.IMAGES]);
    const images = result[STORAGE_KEYS.IMAGES] || [];
    if (images.length === 0) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const newJob = {
        id: Date.now(),
        title: tab.title.substring(0, 20) + "...",
        url: tab.url,
        status: 'PENDING',
        images: images
    };

    const jobsResult = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    const jobs = jobsResult[STORAGE_KEYS.JOBS] || [];
    jobs.unshift(newJob);
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });

    await chrome.storage.local.set({ [STORAGE_KEYS.IS_CAPTURING]: false, [STORAGE_KEYS.IMAGES]: [] });
    chrome.action.setBadgeText({ text: "" });

    // 백그라운드에 처리 시작 알림
    chrome.runtime.sendMessage({ action: "PROCESS_JOBS" });
});

// ✨ 전체 삭제 버튼
document.getElementById('clearJobsBtn').addEventListener('click', async () => {
    if(confirm("작업 기록을 모두 삭제하시겠습니까? (파일은 유지됩니다)")) {
        await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: [] });
    }
});

async function loadJobs() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    renderJobs(result[STORAGE_KEYS.JOBS] || []);
}

function renderJobs(jobs) {
    const container = document.getElementById('jobList');
    
    // 리스트 초기화
    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#cbd5e1; font-size:12px; padding:10px;">작업 대기중...</div>`;
        return;
    }

    jobs.slice(0, 5).forEach(job => {
        let badgeClass = 'status-pending';
        let statusText = '대기';
        
        if (job.status === 'PROCESSING') { badgeClass = 'status-processing'; statusText = '분석중'; }
        else if (job.status === 'COMPLETED') { badgeClass = 'status-completed'; statusText = '완료!'; }
        else if (job.status === 'FAILED') { badgeClass = 'status-failed'; statusText = '실패'; }

        // HTML 요소 생성
        const div = document.createElement('div');
        div.className = 'job-item';
        div.innerHTML = `
            <div class="job-info">
                <span class="job-title" title="${job.title}">${job.title}</span>
            </div>
            <div class="job-actions">
                <span class="status-badge ${badgeClass}">${statusText}</span>
                <button class="btn-delete-job" data-id="${job.id}">✕</button>
            </div>
        `;

        // 삭제 버튼 이벤트 연결
        const deleteBtn = div.querySelector('.btn-delete-job');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 이벤트 버블링 방지
            deleteJob(job.id);
        });

        container.appendChild(div);
    });
}

// ✨ [추가됨] 개별 작업 삭제 함수
async function deleteJob(jobId) {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    let jobs = result[STORAGE_KEYS.JOBS] || [];
    
    // 해당 ID를 제외하고 저장
    const newJobs = jobs.filter(job => job.id !== jobId);
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: newJobs });
}