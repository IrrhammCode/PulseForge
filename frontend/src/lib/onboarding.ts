import {
  ONBOARDING_COOKIE,
  ONBOARDING_STORAGE_KEY,
} from "@/lib/onboarding.constants";

export { ONBOARDING_COOKIE, ONBOARDING_STORAGE_KEY };

export function isOnboardedClient(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1" ||
    document.cookie.includes(`${ONBOARDING_COOKIE}=1`)
  );
}

export function completeOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${ONBOARDING_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  document.cookie = `${ONBOARDING_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Full navigation so middleware reliably reads the onboarding cookie */
export function enterApp(path = "/studio"): void {
  completeOnboarding();
  window.location.assign(path);
}