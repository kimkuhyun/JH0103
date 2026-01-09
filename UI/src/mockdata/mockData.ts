<<<<<<< HEAD
import type{ Job } from '../types/index.ts';
=======
import { Job } from '../types/index.ts';
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c

export const MOCK_JOBS: Job[] = [
  {
    id: 1,
    company: "스튜디오 웨이브",
    role: "프로덕트 디자이너 (UI/UX)",
    status: "WRITING",
    deadline: "D-5",
    location: "서울 성동구 성수동",
    commuteTime: "42분",
    tags: ["스타트업", "Figma"],
    lat: 37.544579,
    lng: 127.056045
  },
  {
    id: 2,
    company: "핀테크 솔루션즈",
    role: "백엔드 개발자",
    status: "INBOX",
    deadline: "D-12",
    location: "서울 영등포구 여의도동",
    commuteTime: "35분",
    tags: ["금융IT", "Java"],
    lat: 37.521568, 
    lng: 126.924314
  }
];