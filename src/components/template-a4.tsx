import type { CV } from '@/services/cv';
import { Fragment } from 'react/jsx-runtime';
import { A4Page, Head, List, ListItem, Section } from './blocks';
import { H1, H2, H3, Subtitle } from './typography';

type TemplateA4Props = {
  cv: CV;
};

export function TemplateA4({ cv }: TemplateA4Props) {
  return (
    <A4Page>
      <Head>
        <div className="text-center leading-tight">
          <H1>{cv.name}</H1>

          <p className="text-md">{cv.titles.join(' | ')}</p>
          <p className="text-md">
            {cv.contacts.map((contact, index) => (
              <Fragment key={index}>
                {contact.type === 'linkedin' && (
                  <a href={`https://linkedin.com/in/${contact.value}`} target="_blank" rel="noopener noreferrer">
                    linkedin.com/in/{contact.value}
                  </a>
                )}
                {contact.type === 'github' && (
                  <a href={`https://github.com/${contact.value}`} target="_blank" rel="noopener noreferrer">
                    github.com/{contact.value}
                  </a>
                )}
                {contact.type === 'email' && (
                  <a href={`mailto:${contact.value}`} target="_blank" rel="noopener noreferrer">
                    {contact.value}
                  </a>
                )}
                {contact.type === 'phone' && (
                  <a href={`tel:+${contact.value.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                    {contact.value}
                  </a>
                )}
                {['website'].includes(contact.type) && contact.value}
                {index < cv.contacts.length - 1 && ' | '}
              </Fragment>
            ))}
          </p>
          <p className="text-md">{cv.location}</p>
        </div>
      </Head>

      <Section title={<H2>Profile</H2>}>
        <p className="text-[10pt] leading-tight text-black">{cv.profile}</p>
      </Section>

      <Section title={<H2>Work Experience</H2>} right={<span className="text-[8pt] text-black">({cv.work.length} recent)</span>}>
        <div className="space-y-[10pt]">
          {cv.work.map((job, index) => (
            <div key={index}>
              <div className="mb-[4pt]">
                <H3>
                  {job.position} at{' '}
                  {job.link ? (
                    <a href={job.link} target="_blank" rel="noopener noreferrer">
                      {job.company}
                    </a>
                  ) : (
                    job.company
                  )}
                  {job.description && `, ${job.description}`}
                </H3>
                <Subtitle>
                  {job.location && `${job.location}, `}
                  {job.start} — {job.end}
                </Subtitle>
              </div>
              <List className="mb-[4pt]">
                {job.achievements.map((achievement, idx) => (
                  <ListItem key={idx}>{achievement}</ListItem>
                ))}
              </List>
              {job.stack && (
                <p className="text-md">
                  <span className="font-semibold">Stack:</span> {job.stack.join(', ')}.
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title={<H2>Education</H2>}>
        <List noPadding>
          {cv.education.map((edu, index) => (
            <ListItem key={index}>
              {edu.title}
              {edu.description && `: ${edu.description}`}, {edu.school}
              {edu.location && `, ${edu.location}`}
              {edu.end && ` — ${edu.end}`}
            </ListItem>
          ))}
        </List>
      </Section>

      {cv.extras && (
        <Section title={<H2>Extras and Charity</H2>}>
          <List noPadding>
            {cv.extras.map((extra, index) => (
              <ListItem key={index}>
                {extra.title}
                {extra.organization && ` of ${extra.organization}`}
                {extra.description && `. ${extra.description}`}
                {extra.location && ` (${extra.location}`}
                {extra.start && `, ${extra.start}`}
                {extra.end && ` — ${extra.end}`}
                {extra.location && ')'}
              </ListItem>
            ))}
          </List>
        </Section>
      )}
    </A4Page>
  );
}

export default TemplateA4;
