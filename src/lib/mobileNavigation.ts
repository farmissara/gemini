import type { NavTab } from '../components/layout/Sidebar';
import type { MobileTab } from '../features/mobile-shell/types';
import type { UserRole } from '../types';

export const getMobileTabForNavTab = (tab: NavTab, currentRole: UserRole): MobileTab | null => {
  switch (tab) {
    case 'dashboard':
      return 'home';
    case 'super_admin_console':
      return currentRole === 'super_admin' ? 'super_schools' : null;
    case 'executive_monitor':
      return 'executive';
    case 'mobile_checkin':
      return 'checkin';
    case 'gradebook':
      return currentRole === 'student' ? 'student_grades' : 'gradebook';
    case 'portfolio':
      return 'portfolio';
    case 'career_quest':
      return 'career_quest';
    case 'timetable':
      return 'timetable';
    case 'games':
      return 'games';
    case 'homework':
      return 'homework';
    case 'announcements':
      return 'announcements';
    case 'behavior_sdq':
      return 'behavior_sdq';
    case 'infirmary':
      return 'infirmary';
    default:
      return null;
  }
};
