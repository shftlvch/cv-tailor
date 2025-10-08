import type { CV } from './cv';

export const MAX_SHRINK_ATTEMPTS = 16;
const MIN_ACHIEVEMENTS_TO_PRESERVE = 2;
export function shrink(cv: CV, attempt: number): CV {
  if (attempt === 0) {
    return cv;
  }
  const hasSecondaryAchievementsToShrink = cv.work.reduce(
    (acc, work, index) => acc + (work.achievements.length > MIN_ACHIEVEMENTS_TO_PRESERVE && index > 0 ? 1 : 0),
    0
  );

  if (hasSecondaryAchievementsToShrink) {
    // Remove 1 achievement from each work experience except the first one, if there is more than 2 achievements
    return {
      ...cv,
      work: cv.work.map((work, index) => ({
        ...work,
        achievements:
          index === 0
            ? work.achievements
            : work.achievements.length > MIN_ACHIEVEMENTS_TO_PRESERVE
            ? work.achievements.slice(0, -1)
            : work.achievements,
      })),
    };
  }
  if (attempt < MAX_SHRINK_ATTEMPTS) {
    // Remove last 1 achievement from the first work experience, if there is more than 2 achievements
    return {
      ...cv,
      work: cv.work.map((work, index) => ({
        ...work,
        achievements:
          index === 0
            ? work.achievements.length > 2
              ? work.achievements.slice(0, -1)
              : work.achievements
            : work.achievements,
      })),
    };
  }
  throw new Error(`Attempt to shrink CV exceeded ${MAX_SHRINK_ATTEMPTS} attempts`);
}
