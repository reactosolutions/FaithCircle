function scorePassword(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const FILL_CLASS = ["bg-destructive", "bg-destructive", "bg-accent", "bg-success", "bg-success"];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const score = scorePassword(password);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${step <= score - 1 ? FILL_CLASS[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{LABEL[score]}</span>
    </div>
  );
}
