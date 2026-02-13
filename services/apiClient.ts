const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, name: string, age: number, location?: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, age, location }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async googleSignIn(googleToken: string, email: string, name: string, profilePicture?: string) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ googleToken, email, name, profilePicture }),
    });
    this.setToken(data.token);
    return data;
  }

  // Get current user based on stored token
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Users
  async getUser(userId: string) {
    return this.request(`/users/${userId}`);
  }

  async getAllUsers() {
    return this.request('/users');
  }

  async updateProfile(userId: string, updates: any) {
    console.log('[DEBUG apiClient] updateProfile called with:', { userId, updates });
    const result = await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    console.log('[DEBUG apiClient] updateProfile response:', result);
    return result;
  }

  async recordSwipe(userId: string, targetUserId: string, action: 'pass' | 'like' | 'superlike') {
    return this.request(`/users/${userId}/swipe`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId, action }),
    });
  }

  async deductCoin(userId: string) {
    return this.request(`/users/${userId}/deduct-coin`, {
      method: 'POST',
    });
  }

  // Chats
  async getChats() {
    return this.request('/chats');
  }

  async getChat(chatId: string) {
    return this.request(`/chats/${chatId}`);
  }

  async createOrGetChat(otherUserId: string) {
    return this.request('/chats/create-or-get', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
  }

  async sendMessage(chatId: string, text: string) {
    return this.request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Reports
  async createReport(reportedId: string, reason: string, type: 'PROFILE' | 'CHAT', targetId: string) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify({ reportedId, reason, type, targetId }),
    });
  }

  async getReports() {
    return this.request('/reports');
  }

  async updateReportStatus(reportId: string, status: string, notes?: string) {
    return this.request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }
}

export default new APIClient();
