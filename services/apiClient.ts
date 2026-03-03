// Use relative API path to leverage Vite proxy during dev, absolute URL in production
const getAPIBaseURL = (): string => {
  const configUrl = import.meta.env.VITE_API_URL;
  
  // In development, use relative path to use Vite proxy
  if (import.meta.env.DEV && configUrl?.includes('localhost')) {
    return '/api';
  }
  
  // In production or if configured, use the full URL
  return configUrl || '/api';
};

const API_BASE_URL = getAPIBaseURL();

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
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        let errorData: any = { error: `API Error: ${response.statusText}` };
        let errorMessage = `API Error: ${response.statusText}`;
        try {
          errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.error || errorData.message || errorMessage;
        } catch (parseErr) {
          // couldn't parse error JSON, use the statusText
        }
        const err = new Error(errorMessage);
        (err as any).status = response.status;
        // Preserve all error data from backend for proper error handling
        (err as any).code = errorData.code;
        (err as any).reason = errorData.reason;
        (err as any).message = errorMessage;
        (err as any).suspendedAt = errorData.suspendedAt;
        (err as any).bannedAt = errorData.bannedAt;
        (err as any).supportMessage = errorData.supportMessage;
        (err as any).contactEmail = errorData.contactEmail;
        (err as any).showSuspensionPage = errorData.showSuspensionPage;
        throw err;
      }

      return response.json();
    } catch (error) {
      console.error('[ERROR apiClient.request]', {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status
      });
      throw error;
    }
  }

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

  // Public endpoints (no auth required)
  async getPublicCoinPackages() {
    try {
      console.log('[DEBUG apiClient] Requesting public coin packages from:', `${API_BASE_URL}/public/coin-packages`);
      const response = await fetch(`${API_BASE_URL}/public/coin-packages`, {
        method: 'GET',
        headers: this.getHeaders(),
        // No credentials required for public endpoints
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch coin packages: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[DEBUG apiClient] Coin packages response received:', data);
      return data;
    } catch (error) {
      console.error('[ERROR apiClient] getPublicCoinPackages error:', error);
      throw error;
    }
  }

  // Auth
  async register(email: string, password: string, name: string, age: number, location?: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, age, location }),
    });
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data;
  }

  async googleSignIn(googleToken: string, email: string, name: string, profilePicture?: string) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ googleToken, email, name, profilePicture }),
    });
    return data;
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async requestPasswordReset(email: string) {
    return this.request('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
      credentials: 'omit',
    });
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, newPassword }),
    });
  }

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
        headers: { 'Content-Type': 'application/json' }
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

  // ✅ UPDATED: now accepts lat/lon to enable geo-based profile fetching
  async getProfilesForSwiping(
    limit: number = 100,
    skip: number = 0,
    excludeSeen: boolean = true,
    lat?: number | null,
    lon?: number | null
  ) {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('skip', String(skip));
    params.append('excludeSeen', String(excludeSeen));

    // Pass coordinates so backend uses $geoNear aggregation
    if (lat != null && lon != null) {
      params.append('lat', String(lat));
      params.append('lon', String(lon));
    }

    return this.request(`/users?${params.toString()}`, { method: 'GET' });
  }

  async updateProfile(userId: string, updates: any) {
    return await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async checkUsernameAvailable(username: string, userId?: string) {
    const url = userId
      ? `/users/check-username/${username}?userId=${userId}`
      : `/users/check-username/${username}`;
    return this.request(url, { method: 'POST' });
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
    return this.request('/matches');
  }

  async deleteMatch(matchId: string) {
    return this.request(`/matches/${matchId}`, { method: 'DELETE' });
  }

  async deductCoin(userId: string) {
    return this.request(`/users/${userId}/deduct-coin`, { method: 'POST' });
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
    return this.request(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' });
  }

  async markMessageAsRead(chatId: string, messageId: string) {
    return this.request(`/chats/${chatId}/messages/${messageId}/read`, { method: 'PUT' });
  }

  async markAllMessagesAsRead(chatId: string) {
    return this.request(`/chats/${chatId}/read-all`, { method: 'PUT' });
  }

  async uploadChatMedia(chatId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiBase}/chats/${chatId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
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

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`${API_BASE_URL}/upload/upload-image`, {
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
      console.error('[ERROR apiClient] uploadImage failed:', error);
      throw error;
    }
  }

  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
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

  async getVapidPublicKey() {
    return this.get('/push/vapid-public-key');
  }

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

  async processPurchase(userId: string, amount: number, price: string, method: string = 'CARD', isPremiumUpgrade: boolean = false, details: any = {}) {
    console.log('[DEBUG apiClient] processPurchase called with:', { userId, amount, price, method, isPremiumUpgrade, details });
    const body = {
      userId,
      amount,
      price,
      method,
      isPremiumUpgrade,
      ...details,
    };
    const result = await this.request('/transactions/purchase', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    console.log('[DEBUG apiClient] processPurchase response:', result);
    return result;
  }

  async getTransactionHistory(userId: string) {
    console.log('[DEBUG apiClient] getTransactionHistory called for userId:', userId);
    const result = await this.request(`/transactions/history/${userId}`, { method: 'GET' });
    console.log('[DEBUG apiClient] getTransactionHistory response:', result);
    return result;
  }

  // Lipana mobile‑money integration
  // initiate a charge; backend should send Lipana prompt to supplied number and
  // return a transaction id that can be polled for status.
  // amount is derived on server side from packageId so frontend only needs to supply
  // the chosen package key and phone number.  The backend will look up the package
  // and create a transaction record using the solarized PACKAGES map shown in
  // backend/routes/lipana.js.
  async lipanaInitiate(userId: string, phone: string, packageId: string) {
    console.log('[DEBUG apiClient] lipanaInitiate called with:', { userId, phone, packageId });
    const result = await this.request('/lipana/initiate', {
      method: 'POST',
      body: JSON.stringify({ userId, phone, packageId }),
    });
    console.log('[DEBUG apiClient] lipanaInitiate response:', result);
    return result; // expect { transactionId: string, checkoutRequestID: string }
  }

  async lipanaStatus(txId: string) {
    console.log('[DEBUG apiClient] lipanaStatus called for txId:', txId);
    const result = await this.request(`/lipana/status/${txId}`, { method: 'GET' });
    console.log('[DEBUG apiClient] lipanaStatus response:', result);
    return result; // expect { status: 'pending'|'success'|'failed'|'cancelled', coins?, isPremium?, packageId? }
  }

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
    return this.request(`/chats/${chatId}`, { method: 'DELETE' });
  }

  async getPendingChatRequests() {
    return this.request('/chats/requests/pending', { method: 'GET' });
  }

  async getStalledChats() {
    return this.request('/chats/stalled', { method: 'GET' });
  }

  async assignModeratorToChat(chatId: string, moderatorId: string) {
    return this.request(`/chats/${chatId}/assign-moderator`, {
      method: 'POST',
      body: JSON.stringify({ moderatorId }),
    });
  }

  async getAssignedChats() {
    return this.request('/chats/assigned', { method: 'GET' });
  }

  async sendModeratorMessage(chatId: string, text: string) {
    return this.request(`/chats/${chatId}/moderator-message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async resolveSupportChat(chatId: string) {
    return this.request(`/chats/${chatId}/resolve-support`, { method: 'POST' });
  }

  // Moderation - Unreplied chats
  async getUnrepliedChats() {
    return this.request('/moderation/unreplied-chats', { method: 'GET' });
  }

  // Moderation - Replied chats
  async getRepliedChats() {
    return this.request('/moderation/replied-chats', { method: 'GET' });
  }

  async markChatAsReplied(chatId: string) {
    return this.request(`/moderation/mark-replied/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  }

  // Session Earnings
  async getSessionEarnings() {
    return this.request('/moderation/session-earnings', { method: 'GET' });
  }

  async addSessionEarnings(amount: number) {
    return this.request('/moderation/session-earnings/add', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async clearSessionEarnings() {
    return this.request('/moderation/session-earnings/clear', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getEarningsHistory() {
    return this.request('/moderation/earnings-history', { method: 'GET' });
  }

  async getModeratedChats() {
    return this.request('/moderation/moderated-chats', { method: 'GET' });
  }

  // Payment Methods
  async getPaymentMethods(moderatorId: string) {
    return this.request(`/moderation/payment-methods/${moderatorId}`, { method: 'GET' });
  }

  async addPaymentMethod(moderatorId: string, paymentData: {
    type: string;
    name: string;
    details: string;
  }) {
    return this.request(`/moderation/payment-methods/${moderatorId}`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePaymentMethod(moderatorId: string, methodId: string, paymentData: any) {
    return this.request(`/moderation/payment-methods/${moderatorId}/${methodId}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    });
  }

  async deletePaymentMethod(moderatorId: string, methodId: string) {
    return this.request(`/moderation/payment-methods/${moderatorId}/${methodId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultPaymentMethod(moderatorId: string, methodId: string) {
    return this.request(`/moderation/payment-methods/${moderatorId}/${methodId}/set-default`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  }

  // Payment History & Balance
  async getPaymentHistory(moderatorId: string, limit: number = 50, skip: number = 0) {
    return this.request(`/moderation/payment-history/${moderatorId}?limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });
  }

  async getPaymentBalance(moderatorId: string) {
    return this.request(`/moderation/payment-balance/${moderatorId}`, {
      method: 'GET',
    });
  }

  async recordPayment(moderatorId: string, paymentData: {
    amount: number;
    methodId: string;
    description: string;
  }) {
    return this.request(`/moderation/record-payment/${moderatorId}`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Coin Package Management
  async getCoinPackages(includeInactive: boolean = false) {
    const endpoint = includeInactive ? '/moderation/coin-packages/all' : '/moderation/coin-packages';
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async createCoinPackage(packageData: {
    coins: number;
    price: number;
    description?: string;
    displayOrder?: number;
  }) {
    return this.request('/moderation/coin-packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
  }

  async updateCoinPackage(packageId: number, packageData: {
    coins?: number;
    price?: number;
    description?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    return this.request(`/moderation/coin-packages/${packageId}`, {
      method: 'PUT',
      body: JSON.stringify(packageData),
    });
  }

  async deleteCoinPackage(packageId: number) {
    return this.request(`/moderation/coin-packages/${packageId}`, {
      method: 'DELETE',
    });
  }

  async getCoinPurchases(limit: number = 50, skip: number = 0) {
    return this.request(`/moderation/coin-purchases?limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });
  }

  // User Profile Management
  async updateUserProfile(userId: string, profileData: {
    username?: string;
    email?: string;
    name?: string;
    age?: number;
    bio?: string;
    location?: string;
    role?: string;
  }) {
    return this.request(`/moderation/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async createUserProfile(userData: {
    username: string;
    email: string;
    password: string;
    name?: string;
    age?: number;
    bio?: string;
    location?: string;
    role?: string;
    accountType?: string;
  }) {
    return this.request('/moderation/users/create', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getModeratorChats(userId: string, limit: number = 50, skip: number = 0) {
    return this.request(`/moderation/moderator/${userId}/chats?limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });
  }

  async getModeratorChatCount(userId: string) {
    return this.request(`/moderation/moderator/${userId}/chat-count`, {
      method: 'GET',
    });
  }

  async getModeratorEarnings(userId: string) {
    return this.request(`/moderation/moderator/${userId}/earnings`, {
      method: 'GET',
    });
  }

  async getModeratorEarningsHistory(userId: string, limit: number = 50, skip: number = 0, status?: string) {
    let url = `/moderation/moderator/${userId}/earnings/history?limit=${limit}&skip=${skip}`;
    if (status) url += `&status=${status}`;
    return this.request(url, {
      method: 'GET',
    });
  }

  async getAllModeratorsEarnings() {
    return this.request('/moderation/earnings/summary', {
      method: 'GET',
    });
  }

  async markEarningsAsPaid(userId: string, earningIds: string[], paymentMethod: string, transactionId?: string) {
    return this.request(`/moderation/moderator/${userId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ earningIds, paymentMethod, transactionId }),
    });
  }

  // ==================== ACTIVITY LOG ENDPOINTS ====================

  async getActivityLogs(filters: {
    category?: string;
    action?: string;
    limit?: number;
    skip?: number;
    status?: string;
    actorId?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    return this.request(`/moderation/activity/logs?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getActivitySummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request(`/moderation/activity/summary?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getUserActivityLogs(userId: string, limit: number = 30, skip: number = 0) {
    return this.request(`/moderation/activity/user/${userId}?limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });
  }

  async getModeratorActivityLogs(moderatorId: string, limit: number = 30, skip: number = 0, category?: string) {
    let url = `/moderation/activity/moderator/${moderatorId}?limit=${limit}&skip=${skip}`;
    if (category) url += `&category=${category}`;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  async getChatActivityLogs(chatId: string) {
    return this.request(`/moderation/activity/chat/${chatId}`, {
      method: 'GET',
    });
  }
}

export default new APIClient();