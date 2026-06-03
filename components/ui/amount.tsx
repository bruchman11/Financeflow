import { cn } from "@/lib/utils"
import { formatBRL } from "@/lib/format/currency"

/**
 * Tons semânticos para valores monetários:
 * - income   → verde, prefixo "+"
 * - expense  → vermelho, prefixo "−" (valor exibido em módulo)
 * - result   → resultado/saldo: verde se ≥ 0, vermelho se < 0 (prefixo "−" quando negativo)
 * - account  → saldo de conta: neutro se ≥ 0, vermelho se < 0
 * - neutral  → cinza (transferências/ajustes); sinal segue o sinal do valor
 */
type AmountTone = "income" | "expense" | "result" | "account" | "neutral"

type AmountProps = {
  value: string | number
  tone?: AmountTone
  /** Desliga a cor semântica, mantendo só sinal + formatação. */
  plain?: boolean
  className?: string
}

function Amount({ value, tone = "neutral", plain = false, className }: AmountProps) {
  const n = typeof value === "string" ? Number(value) : value
  const safe = Number.isFinite(n) ? n : 0
  const abs = Math.abs(safe)

  let sign = ""
  let color = "text-muted-foreground"

  switch (tone) {
    case "income":
      sign = "+"
      color = "text-income"
      break
    case "expense":
      sign = "−"
      color = "text-expense"
      break
    case "result":
      sign = safe < 0 ? "−" : ""
      color = safe < 0 ? "text-negative" : "text-positive"
      break
    case "account":
      sign = safe < 0 ? "−" : ""
      color = safe < 0 ? "text-expense" : "text-foreground"
      break
    case "neutral":
      sign = safe < 0 ? "−" : ""
      color = "text-muted-foreground"
      break
  }

  return (
    <span
      data-slot="amount"
      className={cn("tabular-nums", !plain && color, className)}
    >
      {sign}
      {formatBRL(abs)}
    </span>
  )
}

export { Amount, type AmountTone }
