import api from './api';

export interface WeeklyReport {
  id: number;
  user_id: number;
  week_start: string;
  week_end: string;
  content: string;
  achievements: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  overview: string | null;
  user_name?: string;
  department?: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonData {
  currentWeek: {
    weekStart: string;
    weekEnd: string;
    report: WeeklyReport | null;
  };
  previousWeek: {
    weekStart: string;
    weekEnd: string;
    report: WeeklyReport | null;
  };
}

export interface PendingUsersData {
  weekStart: string;
  weekEnd: string;
  pendingUsers: Array<{
    id: number;
    employee_id: string;
    name: string;
    email: string;
    department: string;
  }>;
}

export interface MemberWithReport {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  report_id: number | null;
  content: string | null;
  achievements: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  week_start: string | null;
  week_end: string | null;
  updated_at: string | null;
}

export interface AllMembersData {
  weekStart: string;
  weekEnd: string;
  members: MemberWithReport[];
}

export interface WeekInfo {
  weekStart: string;
  weekEnd: string;
}

export interface MemberReportSummary {
  id: number;
  user_id: number;
  week_start: string;
  week_end: string;
  content: string;
  achievements: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  updated_at: string;
}

export interface MemberWith3WeeksReports {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  team: string | null;
  reports: { [weekStart: string]: MemberReportSummary | null };
}

export interface Members3WeeksData {
  weeks: WeekInfo[];
  members: MemberWith3WeeksReports[];
  canLoadMore: boolean;
}

export interface MemberDetailData {
  member: {
    id: number;
    employee_id: string;
    name: string;
    email: string;
    department: string;
  };
  reports: Array<{
    id: number;
    week_start: string;
    week_end: string;
    content: string;
    achievements: string | null;
    challenges: string | null;
    next_week_plan: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

export const weeklyReportService = {
  getMyReports: async (): Promise<WeeklyReport[]> => {
    const response = await api.get('/weekly-reports/my');
    return response.data;
  },

  getDepartmentReports: async (weekStart?: string, weekEnd?: string): Promise<WeeklyReport[]> => {
    const params = new URLSearchParams();
    if (weekStart) params.append('weekStart', weekStart);
    if (weekEnd) params.append('weekEnd', weekEnd);
    const url = '/weekly-reports/department?' + params.toString();
    const response = await api.get(url);
    return response.data;
  },

  getReportsForComparison: async (userId?: number): Promise<ComparisonData> => {
    const params = userId ? '?userId=' + userId : '';
    const response = await api.get('/weekly-reports/comparison' + params);
    return response.data;
  },

  createOrUpdateReport: async (data: {
    content: string;
    achievements?: string;
    challenges?: string;
    nextWeekPlan?: string;
    overview?: string;
    weekStart?: string;
  }): Promise<{ message: string; report: WeeklyReport }> => {
    const response = await api.post('/weekly-reports', data);
    return response.data;
  },

  getReport: async (id: number): Promise<WeeklyReport> => {
    const response = await api.get('/weekly-reports/' + id);
    return response.data;
  },

  deleteReport: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete('/weekly-reports/' + id);
    return response.data;
  },

  getPendingUsers: async (): Promise<PendingUsersData> => {
    const response = await api.get('/weekly-reports/pending-users');
    return response.data;
  },

  getAllMembersWithReports: async (): Promise<AllMembersData> => {
    const response = await api.get('/weekly-reports/all-members');
    return response.data;
  },

  getMembersReportsLast3Weeks: async (weeks?: number): Promise<Members3WeeksData> => {
    const params = weeks ? `?weeks=${weeks}` : '';
    const response = await api.get('/weekly-reports/members-3weeks' + params);
    return response.data;
  },

  getMemberReports: async (userId: number): Promise<MemberDetailData> => {
    const response = await api.get('/weekly-reports/member/' + userId);
    return response.data;
  },

  generateOverview: async (data: {
    content: string;
    achievements?: string;
    challenges?: string;
    nextWeekPlan?: string;
  }): Promise<{ overview: string }> => {
    const response = await api.post('/weekly-reports/generate-overview', data);
    return response.data;
  },

  exportToExcel: async (filters: {
    department?: string;
    team?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters.department) params.append('department', filters.department);
    if (filters.team) params.append('team', filters.team);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get('/weekly-reports/export?' + params.toString(), {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default weeklyReportService;
