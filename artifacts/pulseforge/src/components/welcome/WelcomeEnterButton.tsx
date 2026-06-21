
import { ArrowRight } from "lucide-react";
import { enterApp } from "@/lib/onboarding";

export function WelcomeEnterButton() {
  return (
    <button type="button" onClick={() => enterApp("/studio")} className="btn-primary">
      Open Studio
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}