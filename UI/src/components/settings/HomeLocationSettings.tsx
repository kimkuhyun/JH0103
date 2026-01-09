import { useState, useEffect } from 'react';
import { MapPin, Save, X, Home as HomeIcon } from 'lucide-react';

interface HomeLocation {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  onClose: () => void;
  onSave: (location: HomeLocation) => void;
}

export function HomeLocationSettings({ onClose, onSave }: Props) {
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // 로컬스토리지에서 기존 집 주소 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('homeLocation');
    if (saved) {
      const location = JSON.parse(saved) as HomeLocation;
      setAddress(location.address);
      setCoords({ lat: location.lat, lng: location.lng });
    }
  }, []);

  // 주소 검색
  const handleSearchAddress = async () => {
    if (!address.trim()) {
      setError('주소를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      // Kakao Maps Geocoder 사용
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        throw new Error('Kakao Maps API가 로드되지 않았습니다.');
      }

      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const lat = parseFloat(result[0].y);
          const lng = parseFloat(result[0].x);
          setCoords({ lat, lng });
          setError('');
        } else {
          setError('주소를 찾을 수 없습니다. 정확한 주소를 입력해주세요.');
          setCoords(null);
        }
        setIsSearching(false);
      });
    } catch (err) {
      console.error('주소 검색 오류:', err);
      setError('주소 검색 중 오류가 발생했습니다.');
      setIsSearching(false);
    }
  };

  // 저장
  const handleSave = () => {
    if (!coords) {
      setError('먼저 주소를 검색해주세요.');
      return;
    }

    const location: HomeLocation = {
      address,
      lat: coords.lat,
      lng: coords.lng,
    };

    // 로컬스토리지에 저장
    localStorage.setItem('homeLocation', JSON.stringify(location));
    
    onSave(location);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-3 rounded-2xl">
              <HomeIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">집 위치 설정</h2>
              <p className="text-sm text-white/80 mt-1">출퇴근 거리 계산을 위한 집 주소를 입력하세요</p>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 space-y-4">
          {/* 주소 입력 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              집 주소
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
                placeholder="예: 서울특별시 강남구 테헤란로 123"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
              <button
                onClick={handleSearchAddress}
                disabled={isSearching}
                className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <MapPin size={18} />
                {isSearching ? '검색중...' : '검색'}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 검색 결과 */}
          {coords && !error && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-teal-600 p-2 rounded-lg">
                  <MapPin size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800 mb-1">주소가 확인되었습니다</div>
                  <div className="text-xs text-slate-500">
                    위도: {coords.lat.toFixed(6)}, 경도: {coords.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-700 mb-2">💡 도움말</div>
            <div>• 정확한 도로명 주소를 입력하면 더 정확한 결과를 얻을 수 있습니다.</div>
            <div>• 설정한 집 주소는 브라우저에 저장되며, 출퇴근 거리 계산에 사용됩니다.</div>
            <div>• 대중교통 경로는 ODsay API를 통해 실시간으로 계산됩니다.</div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t border-slate-100 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!coords}
            className="flex-1 px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}