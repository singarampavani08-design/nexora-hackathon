import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { retainMeetingMemory } from "@/lib/hindsight";
import { hydrateFromSupabase } from "@/lib/store";

interface Ctx {
  assistantOpen: boolean;
  setAssistantOpen: (v: boolean) => void;
  pendingQuestion: string | null;
  askAssistant: (q: string) => void;
  clearPending: () => void;
  demoStep: number; // -1 = off
  startDemo: () => void;
  stopDemo: () => void;
}
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

export const DEMO_STEPS = [
  { caption: "Nexora turns every meeting into persistent memory: Past Meetings → Hindsight → Context → Brief.", ms: 7000 },
  { caption: "Rahul Sharma at Acme Tech: 3 past meetings, all remembered — concerns, decisions and promises.", ms: 8000 },
  { caption: "RETAIN: a new call just ended. Nexora extracts memories from the notes and stores them.", ms: 10000 },
  { caption: "RECALL: preparing the next meeting. Relevant memories are retrieved and ranked.", ms: 6000 },
  { caption: "REFLECT: a personalized brief — open commitments, concerns, and questions to ask.", ms: 14000 },
  { caption: "Ask Nexora anything about past commitments — answers come straight from memory.", ms: 10000 },
  { caption: "That's Nexora: meetings that remember. Thanks for watching!", ms: 5000 },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [pendingQuestion, setPending] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState(-1);
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const askAssistant = useCallback((q: string) => {
    setPending(q);
    setAssistantOpen(true);
  }, []);

  // Load contacts/meetings/memories from Supabase once on mount.
  useEffect(() => {
    void hydrateFromSupabase();
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (demoStep < 0) return;
    const run = async () => {
      switch (demoStep) {
        case 0: setAssistantOpen(false); navigate({ to: "/" }); break;
        case 1: navigate({ to: "/contacts/$contactId", params: { contactId: "rahul" } }); break;
        case 2:
          await retainMeetingMemory({
            contactId: "rahul",
            title: "Quick sync — bulk sync fix",
            date: new Date().toISOString(),
            notes: "Rahul confirmed the bulk sync fix reduced latency to under 800ms. He is still worried about the rollout timeline for 200 seats. We will share a phased onboarding plan by Friday. Rahul prefers weekly written status updates.",
          });
          navigate({ to: "/memory", search: { contact: "rahul" } });
          break;
        case 3: navigate({ to: "/prepare", search: { contact: "rahul", title: "Pricing & rollout discussion", auto: true } }); break;
        case 5: askAssistant("What did we promise Rahul?"); break;
        case 6: setAssistantOpen(false); break;
      }
      if (demoStep < DEMO_STEPS.length) {
        timer.current = setTimeout(() => setDemoStep((s) => (s + 1 >= DEMO_STEPS.length ? -1 : s + 1)), DEMO_STEPS[demoStep]?.ms ?? 5000);
      }
    };
    run();
    return () => clearTimeout(timer.current);
  }, [demoStep, navigate, askAssistant]);

  return (
    <AppCtx.Provider
      value={{
        assistantOpen, setAssistantOpen, pendingQuestion, askAssistant,
        clearPending: () => setPending(null),
        demoStep, startDemo: () => setDemoStep(0), stopDemo: () => setDemoStep(-1),
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}
