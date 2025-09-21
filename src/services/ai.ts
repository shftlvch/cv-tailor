import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponsesModel } from 'openai/resources';
import type z from 'zod';
import { formatJson, lu } from './console';
import ora from 'ora';

const MODEL: ResponsesModel = 'gpt-5-nano';

const createAiClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000, // 60 seconds timeout
    maxRetries: 3, // Retry failed requests up to 3 times
  });
};

export const ai = createAiClient();

export const createChat = async (opts: { systemPrompt: string; userPrompt: string }) => {
  const seedResponse = await ai.responses.create({
    model: MODEL,
    input: [
      {
        role: 'system',
        content: opts.systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: opts.userPrompt,
          },
        ],
      },
    ],
    store: true,
  });
  return seedResponse.id;
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export async function askStructured<T extends z.ZodType<any, z.ZodTypeDef, any>>(opts: {
  previousResponseId?: string;
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  maxOutputTokens?: number;
  progress?: 'none' | 'status' | 'raw';
}) {
  const stream = ai.responses.stream({
    model: MODEL,
    input: [
      { role: 'system', content: opts.systemPrompt },
      {
        role: 'user',
        content: opts.userPrompt,
      },
    ],
    text: {
      format: zodTextFormat(opts.schema, 'structured'),
    },
    max_output_tokens: opts.maxOutputTokens ?? 8000,
    ...(opts.previousResponseId ? { previous_response_id: opts.previousResponseId } : {}),
  });

  let outputBuffer = '';
  const spinner = ora();
  for await (const event of stream) {
    switch (event.type) {
      case 'response.in_progress': {
        if (opts.progress !== 'none') {
          spinner.start('Thinking...');
        }
        break;
      }
      case 'response.output_text.delta': {
        if (opts.progress === 'status') {
          spinner.start('Processing...');
        } else if (opts.progress === 'raw') {
          spinner.stop();
          outputBuffer += event.delta;
          lu(await formatJson(outputBuffer));
        }
        break;
      }
      case 'response.completed': {
        lu.done();
        spinner.succeed('Done');
        break;
      }
    }
  }

  const response = await stream.finalResponse();
  // Parsed result lives on the first output message’s first content item
  const msg = response.output?.find((o) => o.type === 'message');
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const content = (msg as any)?.content?.[0];
  if (!content?.parsed) throw new Error('No parsed JSON received');
  return content.parsed as z.infer<T>;
}
