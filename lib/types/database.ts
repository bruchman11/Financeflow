/**
 * Tipos do banco — escritos à mão para o MVP (sem Supabase CLI).
 * Espelha as migrations em supabase/migrations/.
 * Quando integrarmos a CLI Supabase, este arquivo passa a ser gerado.
 */

export type TransactionType = "income" | "expense";
export type AccountKind = "cash" | "checking" | "savings" | "credit_card" | "other";
export type MemberRole = "owner" | "admin" | "member";
export type DreType = "revenue" | "cost" | "expense" | "tax";
export type TransactionKind =
  | "regular"
  | "transfer"
  | "adjustment"
  | "card_payment";
export type FixedExpenseFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "custom";
export type FixedExpenseStatus = "active" | "inactive";
export type CreditCardInvoiceStatus = "open" | "closed" | "paid" | "overdue";
export type BillStatus = "pending" | "paid" | "canceled";
export type BillSource = "manual" | "import";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          tax_id: string | null;
          created_by: string;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          tax_id?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          legal_name?: string | null;
          tax_id?: string | null;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          company_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
          role?: MemberRole;
        };
        Update: {
          role?: MemberRole;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          kind: AccountKind;
          opening_balance: string; // numeric chega como string
          is_archived: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          kind?: AccountKind;
          opening_balance?: string | number;
          is_archived?: boolean;
        };
        Update: {
          name?: string;
          kind?: AccountKind;
          opening_balance?: string | number;
          is_archived?: boolean;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          parent_id: string | null;
          dre_type: DreType;
          level: number;
          sort_order: number;
          color: string | null;
          is_archived: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          name: string;
          parent_id?: string | null;
          dre_type: DreType;
          level?: number;
          sort_order?: number;
          color?: string | null;
          is_archived?: boolean;
        };
        Update: {
          code?: string;
          name?: string;
          parent_id?: string | null;
          dre_type?: DreType;
          level?: number;
          sort_order?: number;
          color?: string | null;
          is_archived?: boolean;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          company_id: string;
          account_id: string;
          category_id: string | null;
          type: TransactionType;
          amount: string; // numeric → string
          description: string | null;
          occurred_on: string; // date "YYYY-MM-DD"
          competence_date: string; // date "YYYY-MM-DD"
          kind: TransactionKind;
          transfer_group_id: string | null;
          client_request_id: string | null;
          created_by: string;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          account_id: string;
          category_id?: string | null;
          type: TransactionType;
          amount: string | number;
          description?: string | null;
          occurred_on: string;
          competence_date?: string; // se omitido, trigger espelha occurred_on
          kind?: TransactionKind;
          transfer_group_id?: string | null;
          client_request_id?: string | null;
          created_by: string;
        };
        Update: {
          account_id?: string;
          category_id?: string | null;
          type?: TransactionType;
          amount?: string | number;
          description?: string | null;
          competence_date?: string;
          occurred_on?: string;
          kind?: TransactionKind;
        };
        Relationships: [];
      };
      fixed_expenses: {
        Row: {
          id: string;
          company_id: string;
          description: string;
          amount: string;
          frequency: FixedExpenseFrequency;
          custom_interval_days: number | null;
          next_due_date: string;
          category_id: string | null;
          default_account_id: string | null;
          status: FixedExpenseStatus;
          notes: string | null;
          created_by: string;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          description: string;
          amount: string | number;
          frequency: FixedExpenseFrequency;
          custom_interval_days?: number | null;
          next_due_date: string;
          category_id?: string | null;
          default_account_id?: string | null;
          status?: FixedExpenseStatus;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          description?: string;
          amount?: string | number;
          frequency?: FixedExpenseFrequency;
          custom_interval_days?: number | null;
          next_due_date?: string;
          category_id?: string | null;
          default_account_id?: string | null;
          status?: FixedExpenseStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      fixed_expense_payments: {
        Row: {
          id: string;
          company_id: string;
          fixed_expense_id: string;
          transaction_id: string;
          paid_at: string;
          amount_paid: string;
          account_id: string;
          due_date_paid: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          fixed_expense_id: string;
          transaction_id: string;
          paid_at: string;
          amount_paid: string | number;
          account_id: string;
          due_date_paid: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          closing_day: number;
          due_day: number;
          limit_amount: string | null;
          payment_account_id: string | null;
          color: string | null;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          closing_day: number;
          due_day: number;
          limit_amount?: string | number | null;
          payment_account_id?: string | null;
          color?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          closing_day?: number;
          due_day?: number;
          limit_amount?: string | number | null;
          payment_account_id?: string | null;
          color?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      credit_card_invoices: {
        Row: {
          id: string;
          company_id: string;
          credit_card_id: string;
          reference_month: string; // YYYY-MM-01
          closing_date: string;
          due_date: string;
          total_amount: string;
          status: CreditCardInvoiceStatus;
          paid_at: string | null;
          payment_transaction_id: string | null;
        } & Timestamps;
        Insert: Record<string, never>;
        Update: {
          status?: CreditCardInvoiceStatus;
        };
        Relationships: [];
      };
      credit_card_purchases: {
        Row: {
          id: string;
          company_id: string;
          credit_card_id: string;
          invoice_id: string;
          category_id: string | null;
          description: string;
          installment_group_id: string;
          total_amount: string;
          installment_number: number;
          installments_total: number;
          installment_amount: string;
          purchase_date: string;
          competence_date: string;
          payee: string | null;
          notes: string | null;
          payment_transaction_id: string | null;
          created_by: string;
        } & Timestamps;
        Insert: Record<string, never>;
        Update: {
          description?: string;
          category_id?: string | null;
          payee?: string | null;
          notes?: string | null;
          payment_transaction_id?: string | null;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          company_id: string;
          description: string;
          beneficiary_name: string | null;
          barcode: string | null;
          digitable_line: string | null;
          amount: string;
          due_date: string;
          category_id: string | null;
          competence_date: string;
          status: BillStatus;
          source: BillSource;
          attachment_url: string | null;
          paid_at: string | null;
          payment_account_id: string | null;
          payment_transaction_id: string | null;
          notes: string | null;
          created_by: string;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          description: string;
          beneficiary_name?: string | null;
          barcode?: string | null;
          digitable_line?: string | null;
          amount: string | number;
          due_date: string;
          category_id?: string | null;
          competence_date: string;
          status?: BillStatus;
          source?: BillSource;
          attachment_url?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          description?: string;
          beneficiary_name?: string | null;
          barcode?: string | null;
          digitable_line?: string | null;
          amount?: string | number;
          due_date?: string;
          category_id?: string | null;
          competence_date?: string;
          status?: BillStatus;
          attachment_url?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_company_member: {
        Args: { _company: string };
        Returns: boolean;
      };
      create_transfer: {
        Args: {
          _from_account_id: string;
          _to_account_id: string;
          _amount: string | number;
          _occurred_on: string;
          _description: string;
          _competence_date?: string | null;
        };
        Returns: string; // uuid group_id
      };
      compute_next_due_date: {
        Args: {
          _frequency: FixedExpenseFrequency;
          _custom_days: number | null;
          _from_date: string;
        };
        Returns: string; // date
      };
      record_fixed_expense_payment: {
        Args: {
          _fixed_expense_id: string;
          _account_id: string;
          _amount: string | number;
          _paid_on: string;
          _due_date_paid: string;
          _category_id?: string | null;
        };
        Returns: string; // uuid da transaction criada
      };
      create_credit_card_purchase: {
        Args: {
          _card_id: string;
          _category_id: string | null;
          _description: string;
          _total_amount: string | number;
          _installments_total: number;
          _purchase_date: string;
          _competence_date?: string | null;
          _payee?: string | null;
          _notes?: string | null;
        };
        Returns: string; // installment_group_id
      };
      pay_credit_card_invoice: {
        Args: {
          _invoice_id: string;
          _account_id: string;
          _amount: string | number;
          _paid_on: string;
        };
        Returns: string; // transaction_id
      };
      pay_bill: {
        Args: {
          _bill_id: string;
          _account_id: string;
          _amount: string | number;
          _paid_on: string;
        };
        Returns: string; // transaction_id
      };
      create_balance_adjustment: {
        Args: {
          _account_id: string;
          _target_balance: string | number;
          _occurred_on: string;
          _reason: string;
        };
        Returns: string | null; // uuid da transação ou null se delta=0
      };
      create_company_with_defaults: {
        Args: {
          _name: string;
          _legal_name?: string | null;
          _tax_id?: string | null;
        };
        Returns: string; // uuid
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Atalhos úteis
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
