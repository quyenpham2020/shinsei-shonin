import api from './api';
import { Team, TeamMember } from '../types';

export const teamService = {
  // Get all teams (filtered by user's authority)
  async getAll(): Promise<Team[]> {
    const response = await api.get('/teams');
    return response.data;
  },

  // Get team by ID
  async getById(id: number): Promise<Team> {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  // Create new team
  async create(data: {
    name: string;
    department_id: number;
    description?: string;
    leader_id?: number;
    webhook_url?: string;
    member_ids?: number[];
  }): Promise<Team> {
    const response = await api.post('/teams', data);
    return response.data;
  },

  // Update team
  async update(id: number, data: {
    name?: string;
    description?: string;
    leader_id?: number | null;
    is_active?: number;
    webhook_url?: string;
  }): Promise<Team> {
    const response = await api.put(`/teams/${id}`, data);
    return response.data;
  },

  // Delete team (soft delete)
  async delete(id: number): Promise<void> {
    await api.delete(`/teams/${id}`);
  },

  // Bulk delete teams
  async bulkDelete(ids: number[]): Promise<void> {
    await api.post('/teams/bulk-delete', { ids });
  },

  // Get team members
  async getMembers(teamId: number): Promise<TeamMember[]> {
    const response = await api.get(`/teams/${teamId}/members`);
    return response.data;
  },

  // Get available members to add to team
  async getAvailableMembers(teamId: number): Promise<TeamMember[]> {
    const response = await api.get(`/teams/${teamId}/available-members`);
    return response.data;
  },

  // Add member to team
  async addMember(teamId: number, userId: number): Promise<void> {
    await api.post(`/teams/${teamId}/members`, { user_id: userId });
  },

  // Remove member from team
  async removeMember(teamId: number, userId: number): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },

  // Get department GM for default leader
  async getDepartmentGM(departmentId: number): Promise<TeamMember | null> {
    const response = await api.get(`/teams/department/${departmentId}/gm`);
    return response.data;
  },
};

export default teamService;
