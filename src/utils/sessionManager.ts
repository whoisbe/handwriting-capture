import { TracingSession, CHARACTER_SET } from '../types/tracing';

const SESSION_STORAGE_KEY = 'tracingSession';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createSession(fontFamily: string, fontSource: string): TracingSession {
  const session: TracingSession = {
    schemaVersion: 1,
    font: {
      family: fontFamily,
      source: fontSource,
      emSize: 1000,
    },
    meta: {
      sessionId: generateUUID(),
      createdAt: new Date().toISOString(),
      appBuild: 'mvp-1',
    },
    set: {},
    currentIndex: 0,
  };

  // Initialize all characters
  CHARACTER_SET.forEach((char) => {
    session.set[char] = {
      metrics: {
        advance: 0,
        bounds: [0, 0, 0, 0],
        baseline: 0,
      },
      variants: [],
    };
  });

  return session;
}

export function saveSession(session: TracingSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): TracingSession | null {
  const data = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function downloadSession(session: TracingSession): void {
  // Create a clean copy without currentIndex
  const { currentIndex, ...cleanSession } = session;
  
  const dataStr = JSON.stringify(cleanSession, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `tracing-${session.font.family.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
