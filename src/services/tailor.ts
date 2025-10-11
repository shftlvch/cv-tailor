import z from 'zod';
import { askStructured, createChat } from './ai';
import {
  type CV,
  ProfileSchema,
  TitlesSchema,
  WorkExperienceAchievementSchema,
  WorkExperienceStackItemSchema,
} from './cv';
import { MatchScoreSchema } from './schemas';
import type { JD } from './jd';

export async function seed(
  jd: JD,
  options?: {
    language: string;
    tone: string;
    maxCharacters: number;
  }
) {
  const { language = 'EN_UK', tone = 'Professional' } = options ?? {};

  const systemPrompt = `
You are a CV optimiser. Keep facts honest; do not invent. 
Prefer metrics, action verbs, and ATS-friendly phrasing.

Guidelines:
- Language: ${language}
- Tone: ${tone}
- Preserve the original structure and formatting intent
- Use action verbs and quantifiable achievements
- Incorporate relevant keywords naturally
- Maintain truthfulness - enhance but don't fabricate

The optimisation should:
1. Align content with job requirements
2. Improve keyword relevance
3. Enhance readability and impact
4. Maintain professional authenticity
5. Respect character limits
`;

  const userPrompt = `
Here is the job description that you need to optimise the CV for.

Structured job description:
${jd.structured}
`;
  return createChat({
    systemPrompt,
    userPrompt,
  });
}

const OptimiseTitlesSchema = z.object({
  originalMatchScorePct: MatchScoreSchema.describe(
    'The match score of the original titles to the job description in percentage from 0 to 100.'
  ),
  optimisedMatchScorePct: MatchScoreSchema.describe(
    'The match score of the optimised titles to the job description in percentage from 0 to 100.'
  ),
  optimisedTitles: TitlesSchema,
  gaps: z
    .array(z.string())
    .describe('What is missing from the titles to make them more relevant to the job description.'),
  suggestions: z
    .array(z.string())
    .describe('Any unconfirmed suggestions that would work 100% for ATS parsing but not aligned with original titles.'),
});

export type TailoredTitles = z.infer<typeof OptimiseTitlesSchema>;
export type TailoredTitlesResult = { responseId: string; response: TailoredTitles };

export async function tailorTitles(
  previousResponseId: string,
  cv: CV,
  jd: JD,
  feedback?: string[]
): Promise<TailoredTitlesResult> {
  const systemPrompt = `
You'll be given multiple possible titles for the CV.
Choose the best 3 titles that match the job description.
Optimise the chosen titles to make them more relevant to the job description.
You can modify the titles but only based on profile and work achievements, maintain truthfulness.
Give recommendations for the gaps and unconfirmed suggestions only for the titles, not for the CV as a whole.
Keep language of the profile aligned with the job description language.

Formatting:
- Maximum 3 titles
- Every title length can be maximum 30 characters
- Every title is unique to further joining to a '|' separated string.
- Do not use '—', prefer comma if needed.
- Do not repeat terms across titles.
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: [
      `The job description analysed:`,
      JSON.stringify(jd.structured),
      `Original CV:`,
      JSON.stringify(cv),
      `Titles from the original CV:`,
      JSON.stringify(cv.titles),
      ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
    ],
    schema: OptimiseTitlesSchema,
    model: 'gpt-5-mini',
    stream: true,
    progress: 'reasoning',
  });
}

const OptimiseProfileSchema = z.object({
  originalMatchScorePct: MatchScoreSchema.describe(
    'The match score of the original profile to the job description in percentage from 0 to 100.'
  ),
  optimisedMatchScorePct: MatchScoreSchema.describe(
    'The match score of the optimised profile to the job description in percentage from 0 to 100.'
  ),
  optimisedProfile: ProfileSchema,
  gaps: z
    .array(z.string())
    .describe('What is missing from the profile to make it more relevant to the job description.'),
  suggestions: z
    .array(z.string())
    .describe(
      'Any unconfirmed suggestions that would work 100% for ATS parsing but not aligned with original profile.'
    ),
  atsPerfectMatch: z
    .string()
    .describe(
      'The profile that would be ATS perfect match for the job description but might not be aligned with original profile.'
    ),
});

export type TailoredProfile = z.infer<typeof OptimiseProfileSchema>;
export type TailoredProfileResult = { responseId: string; response: TailoredProfile };

export async function tailorProfile(
  previousResponseId: string,
  cv: CV,
  jd: JD,
  feedback?: string[]
): Promise<TailoredProfileResult> {
  const systemPrompt = `
You'll be given a profile for the CV, the CV itself and the Job Description.
Optimise the profile of the CV based on the job description.
You can modify the profile but only based on profile and work achievements, maintain truthfulness.
Use the analysed job description to make the profile more relevant to the job description.
Use ATS keywords, tech stack, and key requirements, and key skills to make the profile more relevant to the job description.
Keep language of the profile aligned with the job description language.

Formatting:
- Maximum 300—400 characters
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: [
      `The job description analysed:`,
      JSON.stringify(jd.structured),
      `Original CV:`,
      JSON.stringify(cv),
      `Profile from the original CV:`,
      JSON.stringify(cv.profile),
      ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
    ],
    stream: true,
    progress: 'reasoning',
    schema: OptimiseProfileSchema,
  });
}

const OptimiseWorkExperienceSchema = z.object({
  originalMatchScorePct: MatchScoreSchema.describe(
    'The match score of the original work experience to the job description in percentage from 0 to 100.'
  ),
  optimisedMatchScorePct: MatchScoreSchema.describe(
    'The match score of the optimised work experience to the job description in percentage from 0 to 100.'
  ),
  optimisedAchievements: z.array(
    z.object({
      matchScorePct: MatchScoreSchema.describe(
        'The match score of the achievement to the job description in percentage from 0 to 100.'
      ),
      optimisedAchievement: WorkExperienceAchievementSchema,
    })
  ),
  optimisedStack: z.array(
    z.object({
      matchScorePct: MatchScoreSchema.describe(
        'The match score of the stack item to the job description in percentage from 0 to 100.'
      ),
      optimisedStack: WorkExperienceStackItemSchema,
    })
  ),
});

export type TailoredWorkExperience = z.infer<typeof OptimiseWorkExperienceSchema>;
export type TailoredWorkExperienceResult = { responseId: string; response: TailoredWorkExperience };

export async function tailorWorkExperience(
  previousResponseId: string,
  cv: CV,
  jd: JD,
  feedback?: string[]
): Promise<TailoredWorkExperienceResult[]> {
  const systemPrompt = `
You'll be given a work experience for the CV, the CV itself and the Job Description.
Optimise the work experience of the original CV based on the job description analysis.
You can modify the work experience but only based on work experience and work achievements, maintain truthfulness.
Use the analysed job description to make the work experience more relevant to the job description.
Use ATS keywords, tech stack, and key requirements, and key skills to make the work experience more relevant to the job description.
Keep language of the profile aligned with the job description language.

Optimise:
1. Achievements: 150 characters max each
2. Stack: 18 characters max each, one term per item. Example: Wrong: "AWS (CDK, Lambda)", Correct: "AWS", "CDK", "Lambda"
`;
  return Promise.all(
    cv.work.map((work) =>
      askStructured({
        previousResponseId,
        systemPrompt,
        userPrompt: [
          `The job description analysed:`,
          JSON.stringify(jd.structured),
          `Original complete CV:`,
          JSON.stringify(cv),
          `Work experience you should optimise from the original CV:`,
          JSON.stringify(work),
          ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
        ],
        schema: OptimiseWorkExperienceSchema,
      })
    )
  );
}

export async function tailorAll(cv: CV, jd: JD) {
  const seedResponseId = await seed(jd);

  const [titles, profile, workExperience] = await Promise.all([
    tailorTitles(seedResponseId, cv, jd),
    tailorProfile(seedResponseId, cv, jd),
    tailorWorkExperience(seedResponseId, cv, jd),
  ]);

  return {
    titles,
    profile,
    workExperience,
    createdAt: new Date().toISOString(),
  };
}

export type TailoredCv = {
  titles: TailoredTitles;
  profile: TailoredProfile;
  workExperience: TailoredWorkExperience[];
  createdAt: string;
};
