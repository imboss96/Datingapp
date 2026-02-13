export function displayName(user: { username?: string; name?: string } | undefined | null) {
  if (!user) return '';
  return (user.username && user.username.trim().length > 0) ? user.username : (user.name || '');
}

export default displayName;
