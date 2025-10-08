import { z } from 'zod';
import { askStructured } from './ai';

const JDExctractionSchema = z.object({
  jobTitle: z.string().describe('The title of the job'),
  jobDescription: z.string().describe('The description of the job'),
  techStack: z.array(z.string()).describe('The tech stack of the job'),
  keyRequirements: z.array(z.string()).describe('The key requirements of the job'),
  keySkills: z.array(z.string()).describe('The key skills of the job'),
  industryContext: z.string().describe('The industry context of the job and the company'),
  companyName: z.string().describe('The name of the company'),
  companyCountry: z.string().describe('The country of the company'),
  officeCountry: z.string().describe('The office country of the job'),
  location: z.string().describe('The location of the job'),
  language: z.enum(['EN_UK', 'EN_US', 'OTHER']).describe('The language of the job description'),
  atsKeywords: z.array(z.string()).describe('The ATS keywords of the job that should be used to optimise the CV.'),
  atsType: z.enum([
    'greenhouse',
    'lever',
    'workable',
    'indeed',
    'ziprecruiter',
    'bamboohr',
    'icims',
    'taleo',
    'adp',
    'smartrecruiters',
    'bullhorn',
    'jazzhr',
    'breezyhr',
    'recruitee',
    'ashby',
    'jobvite',
    'successfactors',
    'hibob',
    'rippling',
    'gusto',
    'other',
  ]),
  customAtsType: z
    .string()
    .describe('If the ATS type is other, please specify the name of the ATS.')
    .optional()
    .nullable(),
  toneNotes: z.string().describe('Any tone notes that should be used to optimise the CV.').optional().nullable(),
});

export type JD = {
  structured: z.infer<typeof JDExctractionSchema>;
  raw: string;
  createdAt: string;
};

export async function jdExtract(jobDescription: string): Promise<JD> {
  const systemPrompt = `
You are an expert at structured data extraction of job descriptions. 
You will be given semi-structured html text from a website representing a job description. 
You will need to extract and convert into given structure. Do not modify the original text.
`;
  const { response } = await askStructured({
    systemPrompt,
    userPrompt: jobDescription,
    schema: JDExctractionSchema,
    model: 'gpt-5',
    stream: true,
    progress: 'reasoning',
  });
  return {
    structured: response,
    raw: jobDescription,
    createdAt: new Date().toISOString(),
  };
}
