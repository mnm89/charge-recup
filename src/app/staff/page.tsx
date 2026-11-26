import { redirect } from 'next/navigation'
import { StaffDashboard } from '@/components/StaffDashboard'
import { isStaff } from '@/lib/auth'
import { TZ } from '@/lib/config'
import { isYmd, todayIn } from '@/lib/dates'
import { loadStaffPayload } from '@/lib/staff-data'

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function StaffPage(props: { searchParams: Promise<{ day?: string }> }) {
  const searchParams = await props.searchParams
  if (!isStaff()) redirect('/staff/login')

  const today = todayIn(TZ)
  let day = isYmd(searchParams.day) ? searchParams.day : today
  if (day > today) day = today

  const data = await loadStaffPayload(day, today)
  return <StaffDashboard data={data} />
}
