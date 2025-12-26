import {
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  BarChart as BarChartIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { SvgIconComponent } from '@mui/icons-material';

export interface SystemConfig {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  path: string;
  icon: SvgIconComponent;
  color: string;
  enabled: boolean;
  adminOnly?: boolean;
}

// System configurations - easy to extend
export const systems: SystemConfig[] = [
  {
    id: 'shinsei-shonin',
    name: '申請承認管理システム',
    nameEn: 'Application & Approval System',
    description: '各種申請の作成、承認フローの管理を行います',
    path: '/shinsei',
    icon: DescriptionIcon,
    color: '#1976d2',
    enabled: true,
  },
  {
    id: 'weekly-report',
    name: '週間報告管理システム',
    nameEn: 'Weekly Report System',
    description: '週次報告の作成、閲覧、部門管理を行います',
    path: '/weekly-reports',
    icon: AssessmentIcon,
    color: '#2e7d32',
    enabled: true,
  },
  {
    id: 'master-management',
    name: 'マスタ管理',
    nameEn: 'Master Management',
    description: '部署、ユーザー、承認者などのマスタデータを管理します',
    path: '/master',
    icon: AdminPanelSettingsIcon,
    color: '#7b1fa2',
    enabled: true,
    adminOnly: true,
  },
];

export const getEnabledSystems = (): SystemConfig[] => {
  return systems.filter(system => system.enabled);
};

export const getSystemById = (id: string): SystemConfig | undefined => {
  return systems.find(system => system.id === id);
};

export const getSystemByPath = (path: string): SystemConfig | undefined => {
  return systems.find(system => path.startsWith(system.path));
};
