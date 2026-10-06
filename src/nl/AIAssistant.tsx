import { useEffect, useRef, useState } from "react"
import {
  apiAIChat,
  apiAddAISuggestionToPlan,
  type AIMealSuggestion,
} from "./api"
import { todayKey } from "./day"
import aiArtwork from "../assets/nutrisense-ai.jpg"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  meal?: AIMealSuggestion | null
  addedToPlan?: boolean
  error?: boolean
}

const STARTER_PROMPTS = [
  "Suggest me a meal",
  "Suggest a 600 kcal meal",
  "I have ingredients — what can I cook?",
  "Suggest a high-protein meal",
]

interface AIAssistantProps {
  currentDate?: string
  onToast?: (msg: string) => void
}

export function AIAssistant({ currentDate, onToast }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [addingMealId, setAddingMealId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, loading])

  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend ?? input).trim()
    if (!raw || loading) return

    const userMsgId = `user-${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: raw,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput("")
    setLoading(true)

    try {
      const response = await apiAIChat(raw)
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: response.message,
        meal: response.meal ?? null,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      console.error("AI Assistant error:", err)
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        text: "Sorry, I couldn't get a response right now. Please try again.",
        error: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleAddToPlan = async (msgId: string, meal: AIMealSuggestion) => {
    if (addingMealId) return
    setAddingMealId(msgId)

    const targetDate = currentDate || todayKey()
    try {
      await apiAddAISuggestionToPlan(targetDate, meal)
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, addedToPlan: true } : m)),
      )
      window.dispatchEvent(new Event("nutrisense-plan-updated"))
      onToast?.(`Added "${meal.name}" to your meal plan!`)
    } catch (err: any) {
      console.error("Failed to add meal to plan:", err)
      onToast?.(err.message || "Failed to add meal to plan")
    } finally {
      setAddingMealId(null)
    }
  }

  return (
    <>
      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="NutriSense AI Assistant"
          className="rise fixed z-50 bottom-24 md:bottom-24 right-4 sm:right-5 md:right-8 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[400px] h-[520px] max-h-[calc(100vh-8.5rem)] bg-paper rounded-[28px] border border-line shadow-[0_24px_50px_-12px_rgba(35,36,31,.25)] dark:shadow-[0_24px_50px_-12px_rgba(0,0,0,.6)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-line bg-cream/70 dark:bg-sand/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full overflow-hidden shrink-0 border border-leaf/25 bg-paper shadow-xs select-none">
                <img
                  src={aiArtwork}
                  alt="NutriSense AI"
                  className="w-full h-full object-cover object-[50%_42%] scale-125"
                />
              </div>
              <div>
                <h3 className="font-display font-bold text-[15px] leading-tight text-ink flex items-center gap-1.5">
                  NutriSense AI
                </h3>
                <p className="font-sans text-[11px] text-ink-soft leading-tight">
                  Your personal nutrition assistant
                </p>
              </div>
            </div>
            <button
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
              className="size-8 rounded-full hover:bg-sand/60 text-ink-soft hover:text-ink grid place-items-center transition cursor-pointer text-sm font-medium"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center px-2 py-3">
                {/* Compact NutriSense AI visual identity */}
                <div className="size-20 sm:size-22 rounded-full overflow-hidden border-2 border-mint/80 bg-paper shadow-md mx-auto mb-2 select-none shrink-0 ring-4 ring-leaf/5">
                  <img
                    src={aiArtwork}
                    alt="NutriSense AI Assistant"
                    className="w-full h-full object-cover object-[50%_42%] scale-110"
                  />
                </div>
                <h4 className="font-display font-bold text-base text-ink leading-tight">
                  NutriSense AI
                </h4>
                <p className="font-sans text-[11px] text-ink-soft leading-tight mb-1">
                  Your personal nutrition assistant
                </p>
                <p className="font-sans text-xs text-ink/80 font-medium mb-3">
                  What can I help you with?
                </p>

                {/* Predefined Starter Prompts */}
                <div className="w-full space-y-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="w-full text-left p-2.5 px-3.5 rounded-2xl border border-line bg-cream/50 dark:bg-sand/30 hover:bg-cream dark:hover:bg-sand/60 hover:border-leaf/40 text-xs font-semibold text-ink transition-all flex items-center justify-between group cursor-pointer active:scale-[.99]"
                    >
                      <span className="truncate pr-2">{prompt}</span>
                      <span className="text-leaf text-xs font-bold transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] bg-ink text-paper dark:bg-sand-deep dark:text-ink rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs sm:text-sm font-medium shadow-sm leading-relaxed">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 max-w-[94%]">
                        <div className="size-7 rounded-full overflow-hidden shrink-0 border border-leaf/20 bg-paper shadow-xs mt-0.5 select-none">
                          <img
                            src={aiArtwork}
                            alt="NutriSense AI"
                            className="w-full h-full object-cover object-[50%_42%] scale-125"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-semibold text-[11px] text-ink-soft mb-1">
                            NutriSense AI
                          </div>
                          <div className="bg-cream dark:bg-sand/40 text-ink border border-line/60 rounded-2xl rounded-tl-xs p-3.5 text-xs sm:text-sm space-y-2.5 leading-relaxed">
                            <div className="whitespace-pre-wrap">
                              {msg.text}
                            </div>

                            {/* Structured Meal Suggestion Card */}
                            {msg.meal && (
                              <div className="mt-2.5 p-3 rounded-2xl bg-paper dark:bg-sand/80 border border-line/80 shadow-xs space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-leaf bg-mint/50 dark:bg-mint/30 px-2 py-0.5 rounded-full">
                                    {msg.meal.meal_type || "Meal Suggestion"}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-leaf">
                                    {msg.meal.calories} kcal
                                  </span>
                                </div>

                                <div>
                                  <h5 className="font-display font-semibold text-sm text-ink leading-snug">
                                    {msg.meal.name}
                                  </h5>
                                  {msg.meal.description && (
                                    <p className="text-[11px] text-ink-soft leading-normal mt-0.5">
                                      {msg.meal.description}
                                    </p>
                                  )}
                                </div>

                                {/* Macro Pills */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 py-1 text-center font-mono text-[11px]">
                                  <div className="bg-sand/40 dark:bg-sand-deep/30 rounded-xl py-1 px-1.5">
                                    <span className="block text-[9px] uppercase text-ink-soft">
                                      Protein
                                    </span>
                                    <span className="font-bold text-ink">
                                      {msg.meal.protein}g
                                    </span>
                                  </div>
                                  <div className="bg-sand/40 dark:bg-sand-deep/30 rounded-xl py-1 px-1.5">
                                    <span className="block text-[9px] uppercase text-ink-soft">
                                      Carbs
                                    </span>
                                    <span className="font-bold text-ink">
                                      {msg.meal.carbs}g
                                    </span>
                                  </div>
                                  <div className="bg-sand/40 dark:bg-sand-deep/30 rounded-xl py-1 px-1.5">
                                    <span className="block text-[9px] uppercase text-ink-soft">
                                      Fat
                                    </span>
                                    <span className="font-bold text-ink">
                                      {msg.meal.fat}g
                                    </span>
                                  </div>
                                  {msg.meal.fiber > 0 && (
                                    <div className="hidden sm:block bg-sand/40 dark:bg-sand-deep/30 rounded-xl py-1 px-1.5">
                                      <span className="block text-[9px] uppercase text-ink-soft">
                                        Fiber
                                      </span>
                                      <span className="font-bold text-ink">
                                        {msg.meal.fiber}g
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Add to Meal Plan Button */}
                                <button
                                  disabled={
                                    msg.addedToPlan || addingMealId === msg.id
                                  }
                                  onClick={() =>
                                    handleAddToPlan(msg.id, msg.meal!)
                                  }
                                  className={`w-full h-8.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    msg.addedToPlan
                                      ? "bg-mint/80 text-leaf border border-leaf/30 cursor-default"
                                      : "bg-leaf text-paper hover:bg-leaf-deep active:scale-[.98]"
                                  }`}
                                >
                                  {addingMealId === msg.id ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="size-3 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
                                      Adding...
                                    </span>
                                  ) : msg.addedToPlan ? (
                                    <>✓ Added to Plan</>
                                  ) : (
                                    <>+ Add to Meal Plan</>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="size-7 rounded-full overflow-hidden shrink-0 border border-leaf/20 bg-paper shadow-xs mt-0.5 select-none">
                      <img
                        src={aiArtwork}
                        alt="AI"
                        className="w-full h-full object-cover object-[50%_42%] scale-125"
                      />
                    </div>
                    <div className="bg-cream dark:bg-sand/40 border border-line/60 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs flex items-center gap-1.5 text-ink-soft">
                      <span className="size-1.5 rounded-full bg-leaf animate-bounce" />
                      <span
                        className="size-1.5 rounded-full bg-leaf animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="size-1.5 rounded-full bg-leaf animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                      <span className="ml-1 text-[11px] font-medium">
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 border-t border-line bg-paper flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask NutriSense AI..."
              disabled={loading}
              className="flex-1 h-10 px-3.5 rounded-full bg-cream/70 dark:bg-sand/30 border border-line focus:border-leaf focus:outline-none text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="size-10 rounded-full bg-leaf text-paper hover:bg-leaf-deep disabled:opacity-40 disabled:hover:bg-leaf grid place-items-center transition cursor-pointer shrink-0 active:scale-95"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4 ml-0.5"
              >
                <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.112A28.896 28.896 0 0 0 3.105 2.289Z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating AI Button */}
      <button
        aria-label={isOpen ? "Close AI assistant" : "Ask NutriSense AI"}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed z-40 bottom-24 md:bottom-8 right-22 md:right-26 h-14 rounded-full font-semibold transition-all duration-200 active:scale-[.97] cursor-pointer flex items-center justify-center gap-2 shadow-xl ${
          isOpen
            ? "bg-ink text-paper px-4 md:px-5 border border-line/30"
            : "bg-leaf text-paper hover:bg-leaf-deep px-3.5 sm:px-4 md:px-5 shadow-[0_8px_24px_-6px_rgba(47,93,58,.55)]"
        }`}
      >
        <div className="size-7 rounded-full overflow-hidden shrink-0 border border-paper/40 bg-paper shadow-xs select-none">
          <img
            src={aiArtwork}
            alt="NutriSense AI"
            className="w-full h-full object-cover object-[50%_42%] scale-125"
          />
        </div>
        <span className="text-sm tracking-wide hidden sm:inline">
          {isOpen ? "Close AI" : "Ask AI"}
        </span>
      </button>
    </>
  )
}
