// Rolling console log buffer to capture client-side diagnostic logs for support tickets
const logBuffer: string[] = [];
const MAX_LOGS = 15; // Capture up to 15 logs for more comprehensive troubleshooting

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addToBuffer(level: 'INFO' | 'WARN' | 'ERROR', args: any[]) {
  try {
    const formattedArgs = args.map(a => {
      if (a instanceof Error) {
        return a.message + (a.stack ? `\n${a.stack}` : '');
      }
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');

    const logMessage = `[${level}] ${new Date().toISOString()} - ${formattedArgs}`;
    logBuffer.push(logMessage);
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }
  } catch (err) {
    // Fail-safe to avoid loops
  }
}

// Override console methods to capture logs in buffer
console.log = (...args: any[]) => {
  addToBuffer('INFO', args);
  originalLog.apply(console, args);
};

console.warn = (...args: any[]) => {
  addToBuffer('WARN', args);
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  addToBuffer('ERROR', args);
  originalError.apply(console, args);
};

export function getConsoleLogs(): string[] {
  return [...logBuffer];
}
