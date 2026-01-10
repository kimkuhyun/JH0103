// CareerOS Popup Script

const STORAGE_KEYS = { JOBS: 'analysisJobs' };

document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    
    // 캡처 버튼 클릭
    document.getElementById('captureBtn').addEventListener('click', async () => {
        const btn = document.getElementById('captureBtn');
        btn.innerHTML = '<span>캡처 시작...</span>';
        btn.disabled = true;
        
        // 백그라운드에 캡처 시작 메시지 전송
        chrome.runtime.sendMessage({ action: 'START_CAPTURE' });
        
        // 팝업 닫기 (캡처는 백그라운드에서 처리)
        setTimeout(() => window.close(), 500);
    });
    
    // 전체 삭제
    document.getElementById('clearBtn').addEventListener('click', async () => {
        if (confirm('모든 기록을 삭제하시겠습니까?')) {
            await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: [] });
            loadJobs();
        }
    });
});

// 스토리지 변경 감지
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.JOBS]) {
        renderJobs(changes[STORAGE_KEYS.JOBS].newValue || []);
    }
});

async function loadJobs() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    renderJobs(result[STORAGE_KEYS.JOBS] || []);
}

function renderJobs(jobs) {
    const container = document.getElementById('jobList');
    
    if (jobs.length === 0) {
        container.innerHTML = '<div class="empty-state">아직 분석 기록이 없습니다</div>';
        return;
    }
    
    container.innerHTML = jobs.slice(0, 10).map(job => {
        const statusText = {
            'PROCESSING': '분석중',
            'COMPLETED': '완료',
            'FAILED': '실패'
        }[job.status] || job.status;
        
        return `
            <div class="job-item">
                <span class="job-title" title="${job.title}">${job.title}</span>
                <span class="status-badge status-${job.status}">${statusText}</span>
            </div>
        `;
    }).join('');
}
