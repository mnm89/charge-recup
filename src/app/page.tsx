import { QuestionnaireForm } from '@/components/QuestionnaireForm';
import { InvalidLink } from '@/components/InvalidLink';
import { TZ } from '@/lib/config';
import { todayIn } from '@/lib/dates';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = 'force-dynamic';

/**
 * Page envoyée aux joueurs chaque matin (le lien est toujours le même).
 * Si PLAYER_KEY est défini, le lien doit contenir ?k=<PLAYER_KEY>.
 */
export default async function Home(props: { searchParams: Promise<{ k?: string }> }) {
 const searchParams = await props.searchParams;
 const required = process.env.PLAYER_KEY;
 if (required && searchParams.k !== required) return <InvalidLink />;
 return <QuestionnaireForm today={todayIn(TZ)} playerKey={required ? searchParams.k : undefined} />;
}
