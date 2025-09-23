import { write as writeFile } from 'bun';

const TMP_DIR = './.tmp';

export function generateFileName(input: string) {
  return `${input.toLowerCase().replace(/[^a-zA-Z0-9:-]/g, '-').replace(/-+/g, '-')}`;
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
