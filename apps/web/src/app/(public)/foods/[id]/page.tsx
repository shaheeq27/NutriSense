import FoodResult from "@/features/food-analysis/components/FoodResult"

export default async function FoodPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <FoodResult id={decodeURIComponent(id)} />
}
