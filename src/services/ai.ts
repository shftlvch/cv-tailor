import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';
import type { ResponsesModel } from 'openai/resources';
import ora from 'ora';
import type z from 'zod';
import { formatJson, lu } from './console';

const DEFAULT_MODEL: ResponsesModel = 'gpt-5-mini';

const createAiClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 120000, // 120 seconds timeout
    maxRetries: 3, // Retry failed requests up to 3 times
  });
};

export const ai = createAiClient();

export const createChat = async (opts: { systemPrompt: string; userPrompt: string }) => {
  const seedResponse = await ai.responses.create({
    model: DEFAULT_MODEL,
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

async function processStream<T extends UnknownZodType>(
  stream: ResponseStream<z.TypeOf<T>>,
  opts: { progress?: 'none' | 'status' | 'raw' }
) {
  let outputBuffer = '';
  const spinner = ora(opts.progress === 'none' ? undefined : 'Starting...');
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
  return stream.finalResponse();
}

function processResponse<T extends UnknownZodType>(response: OpenAI.Responses.Response, schema: T): z.infer<T> {
  const msg = response.output?.find((o) => o.type === 'message');

  if (!msg) throw new Error('No message received');
  const content = msg.content[0];
  if (content?.type === 'refusal') throw new Error('Received refusal');
  if (!content?.text) throw new Error('No text received');
  return schema.parse(JSON.parse(content.text));
}

type UnknownZodType = z.ZodType<unknown, z.ZodTypeDef, unknown>;
type CreateResponseOpts<T extends UnknownZodType> = {
  previousResponseId?: string;
  systemPrompt: string;
  userPrompt: string | string[];
  schema: T;
  maxOutputTokens?: number;
  model?: ResponsesModel;
};
type AskStructuredOpts<T extends UnknownZodType> = CreateResponseOpts<T> & {
  stream?: boolean;
  progress?: 'none' | 'status' | 'raw';
};

async function createResponse<T extends UnknownZodType>(opts: CreateResponseOpts<T>) {
  return ai.responses.create({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: 'system', content: opts.systemPrompt },
      {
        role: 'user',
        content: Array.isArray(opts.userPrompt)
          ? opts.userPrompt.map((t) => ({
              type: 'input_text',
              text: t,
            }))
          : opts.userPrompt,
      },
    ],
    text: {
      format: zodTextFormat(opts.schema, 'structured'),
    },
    ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
    ...(opts.previousResponseId ? { previous_response_id: opts.previousResponseId } : {}),
  });
}

async function createResponseStream<T extends UnknownZodType>(opts: CreateResponseOpts<T>) {
  return ai.responses.stream({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: 'system', content: opts.systemPrompt },
      {
        role: 'user',
        content: Array.isArray(opts.userPrompt)
          ? opts.userPrompt.map((t) => ({
              type: 'input_text',
              text: t,
            }))
          : opts.userPrompt,
      },
    ],
    text: {
      format: zodTextFormat(opts.schema, 'structured'),
    },
    ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
    ...(opts.previousResponseId ? { previous_response_id: opts.previousResponseId } : {}),
  });
}

export async function askStructured<T extends UnknownZodType>(opts: AskStructuredOpts<T>) {
  const response = opts.stream
    ? await processStream(await createResponseStream<T>(opts), { progress: opts.progress })
    : await createResponse<T>(opts);
  return {
    responseId: response.id,
    response: processResponse(response, opts.schema),
  };
}
