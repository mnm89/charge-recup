import { redirect } from 'next/navigation';
import { StaffLogin } from '@/components/StaffLogin';
import { isStaff } from '@/lib/auth';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = 'force-dynamic';

export default function StaffLoginPage() {
  if (isStaff()) redirect('/staff');
  return <StaffLogin />;
}
