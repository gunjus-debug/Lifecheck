export function requireUser(user: any) {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
