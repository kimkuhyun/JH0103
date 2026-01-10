# Changes v2.0

## Problems Fixed

### 1. Image Processing
- Before: Individual image analysis, then merge results
- After: Merge images vertically into single image, then analyze once
- Result: Better context, faster processing

### 2. Capture Accuracy  
- Before: Fixed 5-10 captures, no boundary detection
- After: Detect job posting end markers (apply button, related jobs)
- Limits: 3-5 captures max, 70% container height if no markers
- Result: Single company data only, no mixing

### 3. Async Processing
- Before: Synchronous, browser 30s timeout
- After: Job queue system with polling
- Server: Background worker thread
- Client: Poll every 2s, 2min timeout
- Result: Handle multiple requests, no browser timeout

### 4. Performance
- Image size: 1200px -> 800px
- Image quality: 85 -> 75
- Model timeout: 180s -> 120s
- Result: Faster analysis

## Architecture

```
Extension -> POST /analyze -> Server Queue
Extension <- job_id <- Server
Extension -> GET /status/{job_id} (poll every 2s)
Extension <- result <- Server Worker
```

## Files Changed

```
ai-engine/collectorAI/
├── config.py          # Centralized prompts, reduced image size
├── server.py          # Queue system, worker thread, polling endpoint
└── Dockerfile         # Copy all .py files

extension/
├── content.js         # End marker detection, 5 capture limit
└── background.js      # Async polling, no 30s timeout
```

## Rebuild Required

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker logs -f career-collector
```

## Test Checklist

- [ ] Short posting: 1-2 captures, single company
- [ ] Long posting: 3-5 captures, ends at correct boundary
- [ ] Multiple requests: Queue handles sequential processing
- [ ] No timeout: Polling works within 2 minutes
- [ ] Result JSON: Single company, all fields populated
