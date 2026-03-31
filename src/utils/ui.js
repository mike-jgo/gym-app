export function syncDotClass(status) {
  if (status === 'connected') return 'bg-green shadow-[0_0_8px_var(--green-dim)]';
  if (status === 'syncing')   return 'bg-yellow animate-pulse-dot';
  if (status === 'error')     return 'bg-red';
  return 'bg-muted';
}
