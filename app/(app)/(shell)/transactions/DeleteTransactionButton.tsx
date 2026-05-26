"use client";

import { useRef } from "react";

type Props = {
  transactionId: string;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function DeleteTransactionButton({ transactionId, deleteAction }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteAction}>
      <input type="hidden" name="id" value={transactionId} />
      <button
        type="button"
        onClick={() => {
          if (confirm("Excluir esta movimentação? Esta ação não pode ser desfeita.")) {
            formRef.current?.requestSubmit();
          }
        }}
        className="w-full h-12 text-sm text-destructive hover:underline"
      >
        Excluir movimentação
      </button>
    </form>
  );
}
