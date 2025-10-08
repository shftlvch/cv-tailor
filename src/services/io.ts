import { write as writeFile } from 'bun';

const TMP_DIR = './.tmp';

export function generateFileName(input: string) {
  return `${input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9:-]/g, '-')
    .replace(/-+/g, '-')}`;
}

export async function write(
  filename: string,
  format: 'json' | 'yaml' = 'json',
  data: unknown,
  tmp: boolean = false
): Promise<number> {
  let fileContent: string;
  if (format === 'json') {
    fileContent = JSON.stringify(data, null, 2);
  } else {
    fileContent = Bun.YAML.stringify(data, null, 2);
  }
  return writeFile(`${tmp ? `${TMP_DIR}/` : ''}${generateFileName(filename)}.${format}`, fileContent);
}


const LOG_FILE = `${TMP_DIR}/log.log`;
const logFile = Bun.file(LOG_FILE);
const logWriter = logFile.writer();

export function logToFile(level: 'debug' | 'info' | 'warn' | 'error', message: string, data: unknown) {
  logWriter.write(`[${level}] ${message} ${JSON.stringify(data, null, 2)}\n`, );
  logWriter.flush();
}
