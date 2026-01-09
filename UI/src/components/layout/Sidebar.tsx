import { Briefcase, Calendar, MapPin, User, LogOut } from 'lucide-react';

interface SidebarProps {
  activeMenu: string;
  onMenuClick: (menu: string) => void;
  userName: string;
  onLogout: () => void;
}

export function Sidebar({ activeMenu, onMenuClick, userName, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'board', icon: Briefcase, label: '내 채용 보드' },
    { id: 'calendar', icon: Calendar, label: '일정 캘린더' },
    { id: 'map', icon: MapPin, label: '통근 지도' },
  ];

  return (
    <aside className="w-[260px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-30 h-full">
      {/* 로고 영역 */}
      <div className="h-[72px] flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold mr-3">C</div>
        <span className="text-xl font-extrabold text-slate-800">CareerOS</span>
      </div>

      {/* 메뉴 리스트 */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onMenuClick(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeMenu === item.id 
                ? 'bg-teal-50 text-teal-700' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-slate-200">
            <User size={18} className="text-slate-400"/>
          </div>
          <div className="flex-1 text-sm font-bold truncate text-slate-700">{userName}</div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}