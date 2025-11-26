export function formatBytes(bytes: number, decimals = 1) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export function formatDateTime(date: Date | string | number) {
  const instance =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return instance.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDurationMs(duration?: number) {
  if (!duration || duration <= 0) {
    return '—';
  }
  const seconds = Math.round(duration / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const minutesLeft = minutes % 60;
    if (minutesLeft === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutesLeft}m`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}
