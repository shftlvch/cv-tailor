/**
 *
 * Optimise the CV with a custom prompt
 *
 */

import z from 'zod';
import { askStructured } from './ai';
import {
  ProfileSchema,
  TitlesSchema,
  WorkExperienceAchievementSchema,
  WorkExperienceStackItemSchema,
  type CV
} from './cv';
import { MatchScoreSchema } from './schemas';

const TinkerTitlesSchema = z.object({
  optimisedQualityScore: MatchScoreSchema.describe('The quality of the optimised titles in points from 0 to 100.'),
  optimisedTitles: TitlesSchema,
});

export type TinkedTitles = z.infer<typeof TinkerTitlesSchema>;
export type TinkedTitlesResult = { responseId: string; response: TinkedTitles };

export async function tinkerTitles(
  cv: CV,
  prompt: string,
  previousResponseId?: string,
  feedback?: string[]
): Promise<TinkedTitlesResult> {
  const systemPrompt = `
Guidelines:
- Language: EN_UK
- Tone: Professional
- Preserve the original structure and formatting intent
- You'll be given multiple possible titles for the CV
- Choose the best 3 titles that represent the CV best and align with the prompt
- Optimise the chosen titles to make them more relevant to the CV and will work well for ATS parsing
- You can modify the titles but only based on profile and work achievements, maintain truthfulness

Formatting:
- Maximum 3 titles
- Every title length can be maximum 30 characters
- Every title is unique to further joining to a '|' separated string
- Do not use '—', prefer comma if needed
- Do not repeat terms across titles
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: [
      `Original CV:`,
      JSON.stringify(cv),
      `The prompt with the instructions to optimise the titles:`,
      prompt,
      `Titles from the original CV:`,
      JSON.stringify(cv.titles),
      ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
    ],
    schema: TinkerTitlesSchema,
    model: 'gpt-5',
    stream: false,
    progress: 'none',
  });
}

const TinkerProfileSchema = z.object({
  optimisedQualityScore: MatchScoreSchema.describe('The quality of the optimised profile in points from 0 to 100.'),
  optimisedProfile: ProfileSchema,
});

export type TinkedProfile = z.infer<typeof TinkerProfileSchema>;
export type TinkedProfileResult = { responseId: string; response: TinkedProfile };

export async function tinkerProfile(
  cv: CV,
  prompt: string,
  previousResponseId?: string,
  feedback?: string[]
): Promise<TinkedProfileResult> {
  const systemPrompt = `
Guidelines:
- Language: EN_UK
- Tone: Professional
- Preserve the original structure and formatting intent
- You'll be given a profile for the CV
- Optimise the profile to make it more relevant to the CV and will work well for ATS parsing
- You can modify the profile but only based on profile and work achievements, maintain truthfulness
- Use action verbs and quantifiable achievements
- Incorporate relevant keywords naturally

Formatting:
- Maximum 700 characters
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: [
      `Original CV:`,
      JSON.stringify(cv),
      `The prompt with the instructions to optimise the profile:`,
      prompt,
      `Profile from the original CV:`,
      JSON.stringify(cv.profile),
      ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
    ],
    model: 'gpt-5',
    stream: false,
    progress: 'none',
    schema: TinkerProfileSchema,
  });
}

const TinkerWorkExperienceSchema = z.object({
  optimisedQualityScore: MatchScoreSchema.describe(
    'The quality of the optimised work experience in points from 0 to 100.'
  ),
  optimisedAchievements: z.array(
    z.object({
      matchScorePct: MatchScoreSchema.describe(
        'The match score of the achievement to the prompt in percentage from 0 to 100.'
      ),
      optimisedAchievement: WorkExperienceAchievementSchema,
    })
  ),
  optimisedStack: z.array(
    z.object({
      matchScorePct: MatchScoreSchema.describe(
        'The match score of the stack item to the prompt in percentage from 0 to 100.'
      ),
      optimisedStack: WorkExperienceStackItemSchema,
    })
  ),
});

export type TinkedWorkExperience = z.infer<typeof TinkerWorkExperienceSchema>;
export type TinkedWorkExperienceResult = { responseId: string; response: TinkedWorkExperience };

export async function tinkerWorkExperience(
  cv: CV,
  prompt: string,
  previousResponseId?: string,
  feedback?: string[]
): Promise<TinkedWorkExperienceResult[]> {
  const systemPrompt = `
You'll be given a work experience for the CV, the CV itself and the prompt.
Optimise the work experience of the original CV based on the prompt.
You can modify the work experience but only based on work experience and work achievements, maintain truthfulness.
Use the prompt to make the work experience more relevant to the CV.
Use ATS keywords, tech stack, and key requirements, and key skills to make the work experience more relevant to the CV.
Keep language of the profile aligned with the CV language.
- Use action verbs and quantifiable achievements
- Incorporate relevant keywords naturally

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
          `Original complete CV:`,
          JSON.stringify(cv),
          `The prompt with the instructions to optimise the work experience:`,
          prompt,
          `Work experience from the original CV:`,
          JSON.stringify(work),
          ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
        ],
        stream: false,
        progress: 'none',
        model: 'gpt-5',
        schema: TinkerWorkExperienceSchema,
      })
    )
  );
}

export type TinkedCv = {
  titles: TinkedTitles;
  profile: TinkedProfile;
  workExperience: TinkedWorkExperience[];
  createdAt: string;
};

export async function tinkerAll(
  cv: CV,
  prompt: string,
  previousResponseId?: string,
  feedback?: string[]
): Promise<TinkedCv> {
  const [titles, profile, workExperience] = await Promise.all([
    tinkerTitles(cv, prompt, previousResponseId, feedback),
    tinkerProfile(cv, prompt, previousResponseId, feedback),
    tinkerWorkExperience(cv, prompt, previousResponseId, feedback),
  ]);
  return {
    titles: titles.response,
    profile: profile.response,
    workExperience: workExperience.map((we) => we.response),
    createdAt: new Date().toISOString(),
  };
}
