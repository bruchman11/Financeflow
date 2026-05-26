/**
 * Tipos do banco — escritos à mão para o MVP (sem Supabase CLI).
 * Espelha as migrations em supabase/migrations/.
 * Quando integrarmos a CLI Supabase, este arquivo passa a ser gerado.
 */

export type TransactionType = "income" | "expense";
export type AccountKind = "cash" | "checking" | "savings" | "credit_card" | "other";
export type MemberRole = "owner" | "admin" | "member";

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
          name: string;
          type: TransactionType;
          color: string | null;
          is_archived: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          type: TransactionType;
          color?: string | null;
          is_archived?: boolean;
        };
        Update: {
          name?: string;
          type?: TransactionType;
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
          client_request_id?: string | null;
          created_by: string;
        };
        Update: {
          account_id?: string;
          category_id?: string | null;
          type?: TransactionType;
          amount?: string | number;
          description?: string | null;
          occurred_on?: string;
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
