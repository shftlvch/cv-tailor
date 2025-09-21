#!/usr/bin/env bun
import { createBrowser } from '@/services/browser';
import { formatZodError, printDiff, success, wip } from '@/services/console';
import { loadCV, type CV } from '@/services/cv';
import { scrapeUrl } from '@/services/scraper';
import { generateInlinedHTML } from '@/services/ssg';
import { jdExtract, merge, tailor, type JD, type TailoredCv } from '@/services/tailor';
import { file, write } from 'bun';
import { error as e, log as l } from 'console';
import ora from 'ora';
import prompts from 'prompts';
import { parseArgs } from 'util';
import { ZodError } from 'zod';

const tmpDir = './.tmp';

const { values: opts } = parseArgs({
  args: Bun.argv,
  options: {
    jd: {
      type: 'string',
    },
    jdUrl: {
      type: 'string',
    },
    generateOnly: {
      type: 'boolean',
    },
  },
  strict: true,
  allowPositionals: true,
});

const spinner = ora();

/**
 *
 * Load CV
 *
 */
spinner.start('Loading CV');
let cv: CV;
try {
  cv = await loadCV();
} catch (error) {
  if (error instanceof ZodError) {
    e(formatZodError(error));
  } else {
    e(error);
  }
  spinner.fail('CV loading failed');
  process.exit(1);
}
spinner.succeed('CV loaded');

/**
 *
 * Load Job Description
 *
 */
let jd: JD;

if (opts.jd) {
  jd = await file(opts.jd).json();
} else {
  let jdRaw: string | null = null;

  if (opts.jdUrl) {
    spinner.start(`Scraping job description from URL: ${opts.jdUrl}`);
    jdRaw = await scrapeUrl(opts.jdUrl);
    spinner.succeed('Job description scraped');
  } else {
    const jdType = await prompts({
      type: 'select',
      name: 'jdType',
      message: 'How do you want to enter the job description?',
      choices: [
        { title: 'URL', value: 'url' },
        { title: 'Plain text', value: 'text' },
      ],
    });

    if (jdType.jdType === 'url') {
      const urlAnswers = await prompts({
        type: 'text',
        name: 'url',
        message: 'Enter the job description URL',
      });

      const url = urlAnswers.url;
      spinner.start(`Scraping job description from URL: ${url}`);
      jdRaw = await scrapeUrl(url);
      spinner.succeed('Job description scraped');
    } else {
      const jdPrompt = await prompts({
        type: 'text',
        name: 'jd',
        message: 'Enter the job description',
      });
      jdRaw = jdPrompt.jd;
    }

    if (!jdRaw) {
      spinner.fail('No job description provided or failed to scrape');
      process.exit(1);
    }
  }

  wip('Extracting job description')
  jd = await jdExtract(jdRaw);
  await write(`${tmpDir}/jd-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}.json`, JSON.stringify(jd, null, 2));
  success('Job description extracted');
}

let optimisedResponse: TailoredCv | null = null;
/**
 *
 * Optimize CV
 *
 */
if (!opts.generateOnly) {
  wip('Optimizing CV');
  optimisedResponse = await tailor(cv, jd);
  await write(`${tmpDir}/optimised-cv-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}.json`, JSON.stringify(optimisedResponse, null, 2));
  success('CV optimised');

  l('\n\n--- Please review the output ---\n\n');
  printDiff(`Titles: (match: ${optimisedResponse.titles.relevanceScore})`, cv.titles.join(' | '), optimisedResponse.titles.optimisedTitles.join(' | '));

  const titlesConfirmed = await prompts({
    type: 'confirm',
    name: 'titlesConfirmed',
    message: 'Please confirm the optimised titles.',
    initial: true,
  });
  if (!titlesConfirmed.titlesConfirmed) {
    process.exit(1);
  }

  printDiff(`Profile: (match: ${optimisedResponse.profile.relevanceScore})`, cv.profile, optimisedResponse.profile.optimisedProfile);

  const profileConfirmed = await prompts({
    type: 'confirm',
    name: 'profileConfirmed',
    message: 'Please confirm the optimised profile.',
    initial: true,
  });
  if (!profileConfirmed.profileConfirmed) {
    process.exit(1);
  }

  for (let i = 0; i < optimisedResponse.workExperience.length; i++) {
    const originalWorkExperience = cv.work[i];
    const workExperience = optimisedResponse.workExperience[i];
    if (!workExperience || !originalWorkExperience) {
      continue;
    }
    printDiff(
      `[${i + 1}] ${originalWorkExperience.company} - ${originalWorkExperience.position} (match: ${workExperience.relevanceScore})`,
      originalWorkExperience.achievements.map((achievement) => `- ${achievement}`).join('\n'),
      workExperience.optimisedAchievements.map((achievement) => `- ${achievement.optimisedAchievement} [${achievement.relevanceScore}]`).join('\n')
    );
    if (originalWorkExperience.stack) {
      printDiff(
        'Stack:',
        originalWorkExperience.stack.map((stack) => `- ${stack}`).join('\n'),
        workExperience.optimisedStack.map((stack) => `- ${stack.optimisedStack} [${stack.relevanceScore}]`).join('\n')
      );
    }
  }
  const workExperienceConfirmed = await prompts({
    type: 'confirm',
    name: 'workExperienceConfirmed',
    message: 'Please confirm the optimised work experience.',
    initial: true,
  });
  if (!workExperienceConfirmed.workExperienceConfirmed) {
    process.exit(1);
  }
}

/**
 *
 * Generate pdf
 *
 */
spinner.start('Generating HTML');
const html = await generateInlinedHTML(optimisedResponse ? merge(cv, optimisedResponse) : cv);
spinner.succeed('HTML generated');

spinner.start('Generating PDF');
const browser = await createBrowser({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: 'cv.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
});
await browser.close();
spinner.succeed('Exported cv.pdf');

process.exit(0);
