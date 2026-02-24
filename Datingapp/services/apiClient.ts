const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class APIClient {
  constructor() {
    // Token is now stored in httpOnly cookies, no frontend token management needed
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Send cookies automatically
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

  // Generic HTTP methods for moderation and other endpoints
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth
  async register(email: string, password: string, name: string, age: number, location?: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, age, location }),
    });
    // Token is now set as httpOnly cookie by server, no need to manage it here
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Token is now set as httpOnly cookie by server, no need to manage it here
    return data;
  }

  async googleSignIn(googleToken: string, email: string, name: string, profilePicture?: string) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ googleToken, email, name, profilePicture }),
    });
    // Token is now set as httpOnly cookie by server, no need to manage it here
    return data;
  }

  // Logout - clear cookie on server
  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Get current user based on cookie
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Request password reset
  async requestPasswordReset(email: string) {
    return this.request('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Reset password with token
  async resetPassword(email: string, resetToken: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, newPassword }),
    });
  }

  // Change password for authenticated user
  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Users
  async getUser(userId: string) {
    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const resp = await fetch(`${apiBase}/users/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (resp.status === 404) return null;
      if (!resp.ok) {
        let errBody = null;
        try { errBody = await resp.json(); } catch (e) { /* ignore */ }
        throw new Error((errBody && errBody.error) || `API Error: ${resp.statusText}`);
      }
      return await resp.json();
    } catch (err) {
      throw err;
    }
  }

  async getAllUsers() {
    return this.request('/users');
  }

  async getProfilesForSwiping(limit: number = 100, skip: number = 0, excludeSeen: boolean = true) {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('skip', String(skip));
    params.append('excludeSeen', String(excludeSeen));
    
    return this.request(`/users?${params.toString()}`, { method: 'GET' });
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

  async getMatches(userId: string) {
    // Matches API lives at /api/matches and derives the user from the auth token on the server.
    // Keep optional userId for compatibility, but ignore it client-side.
    return this.request('/matches');
  }

  async deleteMatch(matchId: string) {
    return this.request(`/matches/${matchId}`, {
      method: 'DELETE',
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

    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiBase}/chats/${chatId}/upload`, {
        method: 'POST',
        credentials: 'include', // Send cookies automatically
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

    try {
      const response = await fetch(`${API_BASE_URL}/upload/upload-image`, {
        method: 'POST',
        credentials: 'include', // send httpOnly cookie
        body: formData,
      });

      if (!response.ok) {
        let errBody: any = null;
        try { errBody = await response.json(); } catch (e) { /* ignore */ }
        throw new Error((errBody && errBody.error) || `Upload Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ERROR apiClient] uploadImage failed:', error);
      throw error;
    }
  }

  // Upload multiple images
  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload/upload-images`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        let errBody: any = null;
        try { errBody = await response.json(); } catch (e) { /* ignore */ }
        throw new Error((errBody && errBody.error) || `Upload Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ERROR apiClient] uploadImages failed:', error);
      throw error;
    }
  }

  // Push / PWA
  async getVapidPublicKey() {
    return this.get('/push/vapid-public-key');
  }

  // Email verification
  async requestEmailVerification(email: string) {
    return this.post('/email-verification/register-verify', { email });
  }

  async verifyEmailOTP(email: string, otp: string) {
    return this.post('/email-verification/verify-email', { email, otp });
  }

  async subscribePush(subscription: any) {
    return this.post('/push/subscribe', { subscription });
  }

  async unsubscribePush(endpoint: string) {
    return this.post('/push/unsubscribe', { endpoint });
  }

  async sendTestPush() {
    return this.post('/push/send-test');
  }

  async notifyUser(userId: string, title: string, body: string, data?: any) {
    return this.post('/push/notify-user', { userId, title, body, data });
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

  // Moderator support methods
  async getStalledChats() {
    return this.request('/chats/stalled', {
      method: 'GET',
    });
  }

  async assignModeratorToChat(chatId: string, moderatorId: string) {
    return this.request(`/chats/${chatId}/assign-moderator`, {
      method: 'POST',
      body: JSON.stringify({ moderatorId }),
    });
  }

  async getAssignedChats() {
    return this.request('/chats/assigned', {
      method: 'GET',
    });
  }

  async sendModeratorMessage(chatId: string, text: string) {
    return this.request(`/chats/${chatId}/moderator-message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async resolveSupportChat(chatId: string) {
    return this.request(`/chats/${chatId}/resolve-support`, {
      method: 'POST',
    });
  }

}

export default new APIClient();
