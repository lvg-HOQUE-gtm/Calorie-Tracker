type CrashListener = (message: string) => void;

let lastMessage: string | null = null;
const listeners = new Set<CrashListener>();

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack ? `\n\n${error.stack}` : "";
    return `${error.name}: ${error.message}${stack}`;
  }
  return String(error);
}

/** Records a JS fatal so the launch screen can show it instead of a silent close. */
export function reportJsCrash(error: unknown): void {
  lastMessage = messageFromUnknown(error);
  for (const listener of listeners) {
    listener(lastMessage);
  }
}

export function subscribeJsCrash(listener: CrashListener): () => void {
  listeners.add(listener);
  if (lastMessage) {
    listener(lastMessage);
  }
  return () => {
    listeners.delete(listener);
  };
}
