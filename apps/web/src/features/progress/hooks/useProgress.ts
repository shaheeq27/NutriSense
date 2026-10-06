import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query"
import type { ProgressRange } from "@/types"
import { getProgress } from "../api"

export const useProgress = (range: ProgressRange) =>
  useQuery({
    queryKey: queryKeys.progress(range),
    queryFn: () => getProgress(range),
    placeholderData: keepPreviousData,
  })
