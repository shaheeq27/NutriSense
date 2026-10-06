import PlanView from "@/features/meal-planning/components/PlanView"

export default async function PlanDatePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  return <PlanView date={date} />
}
