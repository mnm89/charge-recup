import { redirect } from 'next/navigation'
import { StaffLogin } from '@/components/StaffLogin'
import { isStaff } from '@/lib/auth'

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function StaffLoginPage() {
  if (await isStaff()) redirect('/staff')
  return <StaffLogin />
}
