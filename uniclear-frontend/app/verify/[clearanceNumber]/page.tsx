import { redirect } from 'next/navigation'

export default async function VerifyRedirectPage({
  params,
}: {
  params: Promise<{ clearanceNumber: string }>
}) {
  const { clearanceNumber } = await params
  redirect(`/verify?number=${encodeURIComponent(clearanceNumber)}`)
}
