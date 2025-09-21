import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponsesModel } from 'openai/resources';
import type z from 'zod';

const MODEL: ResponsesModel = 'gpt-5';

const createAiClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
export async function askStructured<T extends z.ZodType<any, z.ZodTypeDef, any>>(opts: { previousResponseId?: string; systemPrompt: string; userPrompt: string; schema: T }) {
  const res = await ai.responses.parse({
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
    max_output_tokens: 8000,
    ...(opts.previousResponseId ? { previous_response_id: opts.previousResponseId } : {}),
  });

  // Parsed result lives on the first output message’s first content item
  const msg = res.output?.find((o) => o.type === 'message');
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const content = (msg as any)?.content?.[0];
  if (!content?.parsed) throw new Error('No parsed JSON received');
  return content.parsed as z.infer<T>;
}
