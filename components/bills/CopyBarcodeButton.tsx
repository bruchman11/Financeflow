"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Copia o código de barras / linha digitável do boleto para a área de
 * transferência. Mostra confirmação visual e toast.
 */
export function CopyBarcodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o código");
    }
  }

  return (
    <button
      type="button"
      aria-label="Copiar código de barras"
      title="Copiar código de barras"
      onClick={handleCopy}
      className="size-9 rounded-md inline-flex items-center justify-center hover:bg-muted transition-colors"
    >
      {copied ? (
        <Check className="size-4 text-income" />
      ) : (
        <Copy className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}
