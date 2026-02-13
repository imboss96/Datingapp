const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

  async checkUsernameAvailable(username: string, userId?: string) {
    const url = userId 
      ? `/users/check-username/${username}?userId=${userId}`
      : `/users/check-username/${username}`;
    return this.request(url, {
      method: 'POST',
    });
  }

  async updateNotificationSettings(userId: string, settings: any) {
    console.log('[DEBUG apiClient] updateNotificationSettings called with:', { userId, settings });
    const result = await this.request(`/users/${userId}/notifications`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    console.log('[DEBUG apiClient] updateNotificationSettings response:', result);
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

  async editMessage(chatId: string, messageId: string, text: string) {
    return this.request(`/chats/${chatId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  }

  async deleteMessage(chatId: string, messageId: string) {
    return this.request(`/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async markMessageAsRead(chatId: string, messageId: string) {
    return this.request(`/chats/${chatId}/messages/${messageId}/read`, {
      method: 'PUT',
    });
  }

  async markAllMessagesAsRead(chatId: string) {
    return this.request(`/chats/${chatId}/read-all`, {
      method: 'PUT',
    });
  }

  async uploadChatMedia(chatId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('authToken');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/chats/${chatId}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ERROR apiClient] Upload media failed:', error);
      throw error;
    }
  }

  async sendMessageWithMedia(chatId: string, text: string, media: any) {
    return this.request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, media }),
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

  // Upload single image
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Upload Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Upload multiple images
  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await fetch(`${API_BASE_URL}/upload/upload-images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Upload Error: ${response.statusText}`);
    }

    return response.json();
  }

  async processPurchase(userId: string, amount: number, price: string, method: string = 'CARD', isPremiumUpgrade: boolean = false) {
    console.log('[DEBUG apiClient] processPurchase called with:', { userId, amount, price, method, isPremiumUpgrade });
    const result = await this.request('/transactions/purchase', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        amount,
        price,
        method,
        isPremiumUpgrade,
      }),
    });
    console.log('[DEBUG apiClient] processPurchase response:', result);
    return result;
  }

  async getTransactionHistory(userId: string) {
    console.log('[DEBUG apiClient] getTransactionHistory called for userId:', userId);
    const result = await this.request(`/transactions/history/${userId}`, {
      method: 'GET',
    });
    console.log('[DEBUG apiClient] getTransactionHistory response:', result);
    return result;
  }

  // Chat request methods
  async acceptChatRequest(chatId: string) {
    return this.request(`/chats/${chatId}/accept-request`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  }

  async blockChatRequest(chatId: string) {
    return this.request(`/chats/${chatId}/block-request`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  }

  async deleteChat(chatId: string) {
    return this.request(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  async getPendingChatRequests() {
    return this.request('/chats/requests/pending', {
      method: 'GET',
    });
  }
}

export default new APIClient();
