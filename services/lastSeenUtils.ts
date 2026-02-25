/**
 * Utility functions for formatting "last seen" timestamps
 * Similar to WhatsApp's online/last seen status
 */

export const formatLastSeen = (lastSeenTimestamp: number | undefined, isOnline: boolean): string => {
  if (!lastSeenTimestamp) {
    return 'unknown';
  }

  if (isOnline) {
    return 'active now';
  }

  const now = Date.now();
  const diffMs = now - lastSeenTimestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than a minute
  if (diffSecs < 60) {
    return 'just now';
  }

  // Less than an hour
  if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  }

  // Less than a day
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  // Yesterday
  const lastSeenDate = new Date(lastSeenTimestamp);
  const nowDate = new Date(now);
  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);

  if (
    lastSeenDate.getDate() === yesterday.getDate() &&
    lastSeenDate.getMonth() === yesterday.getMonth() &&
    lastSeenDate.getFullYear() === yesterday.getFullYear()
  ) {
    const hours = String(lastSeenDate.getHours()).padStart(2, '0');
    const minutes = String(lastSeenDate.getMinutes()).padStart(2, '0');
    return `yesterday at ${hours}:${minutes}`;
  }

  // More than a day ago
  if (diffDays < 7) {
    const dayName = lastSeenDate.toLocaleDateString('en-US', { weekday: 'long' });
    const hours = String(lastSeenDate.getHours()).padStart(2, '0');
    const minutes = String(lastSeenDate.getMinutes()).padStart(2, '0');
    return `${dayName} at ${hours}:${minutes}`;
  }

  // More than a week ago
  const month = String(lastSeenDate.getMonth() + 1).padStart(2, '0');
  const date = String(lastSeenDate.getDate()).padStart(2, '0');
  const hours = String(lastSeenDate.getHours()).padStart(2, '0');
  const minutes = String(lastSeenDate.getMinutes()).padStart(2, '0');
  return `${month}/${date} at ${hours}:${minutes}`;
};

/**
 * Get a short status indicator (for badges, etc.)
 */
export const getStatusBadge = (isOnline: boolean, lastSeenTimestamp?: number): string => {
  if (isOnline) {
    return 'online';
  }
  if (!lastSeenTimestamp) {
    return 'offline';
  }
  const diffMins = Math.floor((Date.now() - lastSeenTimestamp) / (1000 * 60));
  if (diffMins < 5) {
    return 'online'; // Treat last seen within 5 mins as online
  }
  return 'offline';
};
