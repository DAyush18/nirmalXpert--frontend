// Entry point for /dealer/onboarding (also what `router.replace("/dealer/onboarding")`
// lands on). It renders nothing: app/dealer/_layout.tsx sees this path is not
// legal and redirects to the dealer's real current step.
export default function OnboardingIndex() {
  return null;
}
