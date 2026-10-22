export function postLoginPath(onboardingComplete: boolean): "/" | "/onboarding" {
  return onboardingComplete ? "/" : "/onboarding";
}
