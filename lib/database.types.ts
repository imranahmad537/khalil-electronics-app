export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agreement_items: {
        Row: {
          agreement_id: string;
          id: string;
          product_id: string;
          qty: number;
          serial_no: string | null;
          unit_price: number;
        };
        Insert: {
          agreement_id: string;
          id?: string;
          product_id: string;
          qty?: number;
          serial_no?: string | null;
          unit_price: number;
        };
        Update: {
          agreement_id?: string;
          id?: string;
          product_id?: string;
          qty?: number;
          serial_no?: string | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_items_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      agreements: {
        Row: {
          advance: number;
          agreement_no: number;
          client_ref: string | null;
          closed_on: string | null;
          created_at: string;
          customer_id: string;
          first_due: string | null;
          id: string;
          monthly: number;
          opened_on: string;
          plan_months: number | null;
          sale_type: Database["public"]["Enums"]["sale_type"];
          sales_officer_id: string | null;
          status: Database["public"]["Enums"]["agreement_state"];
          total_price: number;
        };
        Insert: {
          advance?: number;
          agreement_no?: number;
          closed_on?: string | null;
          created_at?: string;
          customer_id: string;
          first_due?: string | null;
          id?: string;
          monthly?: number;
          opened_on?: string;
          plan_months?: number | null;
          sale_type: Database["public"]["Enums"]["sale_type"];
          sales_officer_id?: string | null;
          status?: Database["public"]["Enums"]["agreement_state"];
          total_price: number;
        };
        Update: {
          advance?: number;
          agreement_no?: number;
          closed_on?: string | null;
          created_at?: string;
          customer_id?: string;
          first_due?: string | null;
          id?: string;
          monthly?: number;
          opened_on?: string;
          plan_months?: number | null;
          sale_type?: Database["public"]["Enums"]["sale_type"];
          sales_officer_id?: string | null;
          status?: Database["public"]["Enums"]["agreement_state"];
          total_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "agreements_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_month_status";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "agreements_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreements_sales_officer_id_fkey";
            columns: ["sales_officer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          acc_no: string;
          address: string | null;
          area: string | null;
          avo_id: string | null;
          blacklisted: boolean;
          cell: string;
          cell2: string | null;
          cnic: string | null;
          created_at: string;
          created_by: string | null;
          father_name: string | null;
          full_name: string;
          id: string;
          occupation: string | null;
        };
        Insert: {
          acc_no?: string;
          address?: string | null;
          area?: string | null;
          avo_id?: string | null;
          blacklisted?: boolean;
          cell: string;
          cell2?: string | null;
          cnic?: string | null;
          created_at?: string;
          created_by?: string | null;
          father_name?: string | null;
          full_name: string;
          id?: string;
          occupation?: string | null;
        };
        Update: {
          acc_no?: string;
          address?: string | null;
          area?: string | null;
          avo_id?: string | null;
          blacklisted?: boolean;
          cell?: string;
          cell2?: string | null;
          cnic?: string | null;
          created_at?: string;
          created_by?: string | null;
          father_name?: string | null;
          full_name?: string;
          id?: string;
          occupation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_avo_id_fkey";
            columns: ["avo_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          active: boolean;
          cell: string | null;
          cnic: string | null;
          full_name: string;
          id: string;
          joined_on: string | null;
          profile_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          salary: number;
          left_on: string | null;
        };
        Insert: {
          active?: boolean;
          cell?: string | null;
          cnic?: string | null;
          full_name: string;
          id?: string;
          joined_on?: string | null;
          profile_id?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          salary?: number;
        };
        Update: {
          active?: boolean;
          cell?: string | null;
          cnic?: string | null;
          full_name?: string;
          id?: string;
          joined_on?: string | null;
          profile_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          salary?: number;
        };
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          account: Database["public"]["Enums"]["money_account"];
          amount: number;
          category: string;
          created_by: string | null;
          description: string | null;
          id: string;
          spent_on: string;
        };
        Insert: {
          account: Database["public"]["Enums"]["money_account"];
          amount: number;
          category: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          spent_on?: string;
        };
        Update: {
          account?: Database["public"]["Enums"]["money_account"];
          amount?: number;
          category?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          spent_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      guarantors: {
        Row: {
          address: string | null;
          cell: string | null;
          cnic: string | null;
          customer_id: string;
          father_name: string | null;
          full_name: string;
          id: string;
          relation: string | null;
          slot: number;
        };
        Insert: {
          address?: string | null;
          cell?: string | null;
          cnic?: string | null;
          customer_id: string;
          father_name?: string | null;
          full_name: string;
          id?: string;
          relation?: string | null;
          slot: number;
        };
        Update: {
          address?: string | null;
          cell?: string | null;
          cnic?: string | null;
          customer_id?: string;
          father_name?: string | null;
          full_name?: string;
          id?: string;
          relation?: string | null;
          slot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "guarantors_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_month_status";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "guarantors_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      installments: {
        Row: {
          agreement_id: string;
          carry_in: number;
          due_amount: number;
          due_month: string;
          id: string;
          paid: number;
          seq: number;
          status: Database["public"]["Enums"]["inst_state"];
        };
        Insert: {
          agreement_id: string;
          carry_in?: number;
          due_amount: number;
          due_month: string;
          id?: string;
          paid?: number;
          seq: number;
          status?: Database["public"]["Enums"]["inst_state"];
        };
        Update: {
          agreement_id?: string;
          carry_in?: number;
          due_amount?: number;
          due_month?: string;
          id?: string;
          paid?: number;
          seq?: number;
          status?: Database["public"]["Enums"]["inst_state"];
        };
        Relationships: [
          {
            foreignKeyName: "installments_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          day: string;
          status: "present" | "late" | "half_day" | "leave" | "absent" | "holiday";
          check_in: string | null;
          check_out: string | null;
          in_lat: number | null;
          in_lng: number | null;
          out_lat: number | null;
          out_lng: number | null;
          note: string | null;
          source: "self" | "office";
          marked_by: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      attendance_settings: {
        Row: {
          id: number;
          shift_start: string;
          grace_minutes: number;
          half_day_hours: number;
          weekly_off: number;
          pay_basis: "fixed_30" | "working_days";
          lates_per_day: number;
          paid_leave: boolean;
          sandwich_rule: boolean;
        };
        Insert: never;
        Update: {
          shift_start?: string;
          grace_minutes?: number;
          half_day_hours?: number;
          weekly_off?: number;
          pay_basis?: "fixed_30" | "working_days";
          lates_per_day?: number;
          paid_leave?: boolean;
          sandwich_rule?: boolean;
        };
        Relationships: [];
      };
      payslips: {
        Row: {
          id: string;
          employee_id: string;
          month: string;
          base_salary: number;
          per_day: number;
          absent_days: number;
          half_days: number;
          late_count: number;
          late_days: number;
          unpaid_leave: number;
          not_joined_days: number;
          sandwich_days: number;
          deduction_days: number;
          deduction: number;
          adjustment: number;
          adjustment_note: string | null;
          net_pay: number;
          account: Database["public"]["Enums"]["money_account"];
          paid_on: string;
          expense_id: string | null;
          paid_by: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      job_runs: {
        Row: { job: string; last_run_at: string };
        Insert: { job: string; last_run_at: string };
        Update: { job?: string; last_run_at?: string };
        Relationships: [];
      };
      message_templates: {
        Row: {
          body: string;
          channel: Database["public"]["Enums"]["msg_channel"];
          key: string;
        };
        Insert: {
          body: string;
          channel: Database["public"]["Enums"]["msg_channel"];
          key: string;
        };
        Update: {
          body?: string;
          channel?: Database["public"]["Enums"]["msg_channel"];
          key?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          channel: Database["public"]["Enums"]["msg_channel"];
          created_at: string;
          customer_id: string | null;
          id: string;
          provider_id: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["msg_state"];
          template: string | null;
        };
        Insert: {
          body: string;
          channel: Database["public"]["Enums"]["msg_channel"];
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          provider_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["msg_state"];
          template?: string | null;
        };
        Update: {
          body?: string;
          channel?: Database["public"]["Enums"]["msg_channel"];
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          provider_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["msg_state"];
          template?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_month_status";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "messages_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_template_fkey";
            columns: ["template"];
            isOneToOne: false;
            referencedRelation: "message_templates";
            referencedColumns: ["key"];
          },
        ];
      };
      products: {
        Row: {
          category_id: number | null;
          cost: number;
          id: string;
          min_stock: number;
          model: string | null;
          name: string;
          price: number;
          stock: number;
          vendor_id: string | null;
        };
        Insert: {
          category_id?: number | null;
          cost?: number;
          id?: string;
          min_stock?: number;
          model?: string | null;
          name: string;
          price?: number;
          stock?: number;
          vendor_id?: string | null;
        };
        Update: {
          category_id?: number | null;
          cost?: number;
          id?: string;
          min_stock?: number;
          model?: string | null;
          name?: string;
          price?: number;
          stock?: number;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          cell: string | null;
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          username: string | null;
          is_super: boolean;
          zone: string | null;
        };
        Insert: {
          active?: boolean;
          cell?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          username?: string | null;
          is_super?: boolean;
          zone?: string | null;
        };
        Update: {
          active?: boolean;
          cell?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          username?: string | null;
          is_super?: boolean;
          zone?: string | null;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: {
          id: string;
          product_id: string;
          purchase_id: string;
          qty: number;
          unit_cost: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          purchase_id: string;
          qty: number;
          unit_cost: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          purchase_id?: string;
          qty?: number;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          bill_date: string;
          bill_no: string | null;
          id: string;
          notes: string | null;
          total: number;
          vendor_id: string;
        };
        Insert: {
          bill_date?: string;
          bill_no?: string | null;
          id?: string;
          notes?: string | null;
          total?: number;
          vendor_id: string;
        };
        Update: {
          bill_date?: string;
          bill_no?: string | null;
          id?: string;
          notes?: string | null;
          total?: number;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      receipts: {
        Row: {
          account: Database["public"]["Enums"]["money_account"];
          agreement_id: string;
          amount: number;
          collected_at: string;
          collected_by: string | null;
          customer_id: string;
          id: string;
          installment_id: string | null;
          lat: number | null;
          lng: number | null;
          mode: Database["public"]["Enums"]["pay_mode"];
          notes: string | null;
          receipt_no: number;
          client_ref: string | null;
        };
        Insert: {
          account?: Database["public"]["Enums"]["money_account"];
          agreement_id: string;
          amount: number;
          collected_at?: string;
          collected_by?: string | null;
          customer_id: string;
          id?: string;
          installment_id?: string | null;
          lat?: number | null;
          lng?: number | null;
          mode?: Database["public"]["Enums"]["pay_mode"];
          notes?: string | null;
          receipt_no?: number;
        };
        Update: {
          account?: Database["public"]["Enums"]["money_account"];
          agreement_id?: string;
          amount?: number;
          collected_at?: string;
          collected_by?: string | null;
          customer_id?: string;
          id?: string;
          installment_id?: string | null;
          lat?: number | null;
          lng?: number | null;
          mode?: Database["public"]["Enums"]["pay_mode"];
          notes?: string | null;
          receipt_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_collected_by_fkey";
            columns: ["collected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_month_status";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "receipts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_installment_id_fkey";
            columns: ["installment_id"];
            isOneToOne: false;
            referencedRelation: "installments";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_payments: {
        Row: {
          account: Database["public"]["Enums"]["money_account"];
          amount: number;
          id: string;
          notes: string | null;
          paid_on: string;
          vendor_id: string;
        };
        Insert: {
          account: Database["public"]["Enums"]["money_account"];
          amount: number;
          id?: string;
          notes?: string | null;
          paid_on?: string;
          vendor_id: string;
        };
        Update: {
          account?: Database["public"]["Enums"]["money_account"];
          amount?: number;
          id?: string;
          notes?: string | null;
          paid_on?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_payments_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          address: string | null;
          cell: string | null;
          id: string;
          name: string;
          opening_balance: number;
        };
        Insert: {
          address?: string | null;
          cell?: string | null;
          id?: string;
          name: string;
          opening_balance?: number;
        };
        Update: {
          address?: string | null;
          cell?: string | null;
          id?: string;
          name?: string;
          opening_balance?: number;
        };
        Relationships: [];
      };
      verifications: {
        Row: {
          avo_id: string;
          created_at: string;
          customer_id: string;
          house_type: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          notes: string | null;
          photo_paths: string[] | null;
          status: Database["public"]["Enums"]["verify_state"];
          visited_at: string | null;
          agreement_id: string | null;
        };
        Insert: {
          avo_id: string;
          created_at?: string;
          customer_id: string;
          house_type?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          photo_paths?: string[] | null;
          status?: Database["public"]["Enums"]["verify_state"];
          visited_at?: string | null;
        };
        Update: {
          avo_id?: string;
          created_at?: string;
          customer_id?: string;
          house_type?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          photo_paths?: string[] | null;
          status?: Database["public"]["Enums"]["verify_state"];
          visited_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_avo_id_fkey";
            columns: ["avo_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_month_status";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "verifications_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      customer_month_status: {
        Row: {
          acc_no: string | null;
          area: string | null;
          avo_id: string | null;
          carry: number | null;
          cell: string | null;
          cnic: string | null;
          customer_id: string | null;
          due_now: number | null;
          full_name: string | null;
          g1_cell: string | null;
          g1_cnic: string | null;
          g1_name: string | null;
          g2_cell: string | null;
          g2_cnic: string | null;
          g2_name: string | null;
          monthly_total: number | null;
          months_behind: number | null;
          remaining: number | null;
          status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_avo_id_fkey";
            columns: ["avo_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      approve_verification: { Args: { p_verification: string }; Returns: undefined };
      // p_customer_id / p_new_customer / p_guarantors / p_plan are nullable in SQL
      create_sale: {
        Args: {
          p_client_ref: string;
          p_customer_id: string | null;
          p_new_customer: Json | null;
          p_guarantors: Json | null;
          p_items: Json;
          p_plan: number | null;
          p_advance: number;
          p_mode: Database["public"]["Enums"]["pay_mode"];
          p_account: Database["public"]["Enums"]["money_account"];
        };
        Returns: Json;
      };
      attendance_staff: {
        Args: { p_from?: string | null };
        Returns: {
          id: string;
          full_name: string;
          role: Database["public"]["Enums"]["user_role"];
          joined_on: string | null;
          left_on: string | null;
          has_login: boolean;
          salary: number | null;
        }[];
      };
      assign_customers: { Args: { p_customers: string[]; p_avo: string }; Returns: number };
      cancel_sale: {
        Args: { p_agreement: string; p_refund: number; p_account: Database["public"]["Enums"]["money_account"]; p_reason: string; p_restock?: boolean };
        Returns: undefined;
      };
      create_purchase: {
        Args: { p_vendor: string; p_bill_no: string; p_bill_date: string; p_notes: string; p_items: Json };
        Returns: string;
      };
      queue_reminders: { Args: { p_customers: string[]; p_month_label: string }; Returns: number };
      attendance_check_in: { Args: { p_lat?: number | null; p_lng?: number | null }; Returns: Json };
      attendance_check_out: { Args: { p_lat?: number | null; p_lng?: number | null }; Returns: Json };
      can_manage_login: { Args: { p_target: string }; Returns: boolean };
      mark_attendance: { Args: { p_employee: string; p_day: string; p_status: string | null; p_note?: string | null }; Returns: undefined };
      mark_attendance_bulk: { Args: { p_day: string; p_status: string; p_only_unmarked?: boolean }; Returns: number };
      my_employee_id: { Args: Record<PropertyKey, never>; Returns: string | null };
      record_salary_payment: {
        Args: {
          p_employee: string;
          p_month: string;
          p_figures: Json;
          p_adjustment: number;
          p_note: string | null;
          p_account: Database["public"]["Enums"]["money_account"];
          p_paid_on?: string | null;
        };
        Returns: string;
      };
      undo_salary_payment: { Args: { p_payslip: string }; Returns: undefined };
      is_office: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_super_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      least_loaded_avo: { Args: Record<PropertyKey, never>; Returns: string | null };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      post_receipt: {
        Args: {
          p_account: Database["public"]["Enums"]["money_account"];
          p_agreement: string;
          p_amount: number;
          p_lat?: number;
          p_lng?: number;
          p_mode: Database["public"]["Enums"]["pay_mode"];
          p_client_ref?: string;
        };
        Returns: string;
      };
      reject_verification: { Args: { p_verification: string; p_reason?: string }; Returns: undefined };
      set_employee_active: { Args: { p_employee: string; p_active: boolean }; Returns: string | null };
      shop_today: { Args: Record<PropertyKey, never>; Returns: string };
      submit_visit: {
        Args: {
          p_verification: string;
          p_approve: boolean;
          p_house_type: string;
          p_notes: string;
          p_photo_paths: string[];
          p_lat: number | null;
          p_lng: number | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      agreement_state: "pending_verification" | "open" | "closed" | "cancelled";
      inst_state: "upcoming" | "due" | "short" | "paid" | "overdue" | "default";
      money_account: "cash_in_hand" | "meezan_bank" | "jazzcash";
      msg_channel: "whatsapp" | "sms";
      msg_state: "queued" | "sent" | "delivered" | "failed";
      pay_mode: "cash" | "bank" | "jazzcash" | "easypaisa";
      sale_type: "direct" | "installment";
      user_role: "owner" | "sales" | "avo" | "accountant" | "manager";
      verify_state: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agreement_state: ["pending_verification", "open", "closed", "cancelled"],
      inst_state: ["upcoming", "due", "short", "paid", "overdue", "default"],
      money_account: ["cash_in_hand", "meezan_bank", "jazzcash"],
      msg_channel: ["whatsapp", "sms"],
      msg_state: ["queued", "sent", "delivered", "failed"],
      pay_mode: ["cash", "bank", "jazzcash", "easypaisa"],
      sale_type: ["direct", "installment"],
      user_role: ["owner", "sales", "avo", "accountant", "manager"],
      verify_state: ["pending", "approved", "rejected"],
    },
  },
} as const;
