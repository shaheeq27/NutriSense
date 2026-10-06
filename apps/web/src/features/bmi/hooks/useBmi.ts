import { useMutation } from "@tanstack/react-query"
import { calculateBmi } from "../api"

export const useBmi = () => useMutation({ mutationFn: calculateBmi })
