import type { CV, WorkExperience } from './cv';
import type { TailoredCv } from './tailor';
import type { TinkedCv } from './tinker';

export function merge(originalCv: CV, tailoredCv: TailoredCv | TinkedCv): CV {
  const mergedWorkExperience: WorkExperience[] = originalCv.work.map((work, index) => ({
    ...work,
    achievements:
      tailoredCv.workExperience[index]?.optimisedAchievements
        .sort((a, b) => b.matchScorePct - a.matchScorePct)
        .map((achievement) => achievement.optimisedAchievement) ?? [],
    stack:
      tailoredCv.workExperience[index]?.optimisedStack
        .sort((a, b) => b.matchScorePct - a.matchScorePct)
        .map((stack) => stack.optimisedStack) ?? [],
  }));
  return {
    ...originalCv,
    titles: tailoredCv.titles.optimisedTitles,
    profile: tailoredCv.profile.optimisedProfile,
    work: mergedWorkExperience,
  };
}
