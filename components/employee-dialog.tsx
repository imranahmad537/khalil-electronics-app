"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, UserX } from "lucide-react";
import { createEmployeeAction, updateEmployeeAction, deactivateEmployeeAction, type EmployeeInput } from "@/app/actions/employees";
import { ROLE_LABEL, ASSIGNABLE_ROLES } from "@/lib/roles";
import { showToast } from "@/lib/toast";
import type { EmployeeRow } from "@/lib/data/employees";
import { todayLocalDateStr } from "@/lib/local-date";
import { MaskedInput } from "@/components/masked-input";
import { cellError, cnicError, maskCell, maskCnic } from "@/lib/validation";
import { enterToNextField } from "@/lib/enter-to-next";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";

function today() {
  return todayLocalDateStr();
}

function blankForm(existing?: EmployeeRow): EmployeeInput {
  if (existing) {
    return {
      fullName: existing.fullName,
      role: existing.role,
      cell: existing.cell ?? "",
      cnic: existing.cnic ?? "",
      salary: existing.salary,
      joinedOn: existing.joinedOn ?? today(),
    };
  }
  return { fullName: "", role: "sales", cell: "", cnic: "", salary: 0, joinedOn: today() };
}

function formInvalid(form: EmployeeInput) {
  return !form.fullName.trim() || !!cellError(form.cell) || !!cnicError(form.cnic);
}

function EmployeeFields({
  form,
  setForm,
  showErrors,
}: {
  form: EmployeeInput;
  setForm: React.Dispatch<React.SetStateAction<EmployeeInput>>;
  showErrors: boolean;
}) {
  return (
    <div className="flex flex-col gap-4" onKeyDown={enterToNextField}>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Full name</label>
        <input className={inputCls} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Role</label>
          <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as EmployeeInput["role"] }))}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Joined</label>
          <input type="date" className={inputCls} value={form.joinedOn} onChange={(e) => setForm((f) => ({ ...f, joinedOn: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Cell</label>
          <MaskedInput
            value={form.cell}
            onChange={(v) => setForm((f) => ({ ...f, cell: v }))}
            mask={maskCell}
            placeholder="03XX-XXXXXXX"
            inputMode="numeric"
            error={showErrors ? (cellError(form.cell) ?? undefined) : undefined}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>CNIC</label>
          <MaskedInput
            value={form.cnic}
            onChange={(v) => setForm((f) => ({ ...f, cnic: v }))}
            mask={maskCnic}
            placeholder="00000-0000000-0"
            inputMode="numeric"
            error={showErrors ? (cnicError(form.cnic) ?? undefined) : undefined}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Monthly salary</label>
        <input
          className={`num ${inputCls}`}
          inputMode="numeric"
          value={form.salary || ""}
          onChange={(e) => setForm((f) => ({ ...f, salary: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))}
        />
      </div>
    </div>
  );
}

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EmployeeInput>(blankForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  function submit() {
    setError("");
    setShowErrors(true);
    if (formInvalid(form)) return;
    startTransition(async () => {
      const res = await createEmployeeAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(`${form.fullName} added to the staff register`);
      setOpen(false);
      setForm(blankForm());
      setShowErrors(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
        style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
      >
        <Plus size={16} strokeWidth={2.4} />
        Add employee
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[420px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h2 className="text-[16.5px] font-extrabold m-0">Add employee</h2>
              <button onClick={() => setOpen(false)} className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>
            <EmployeeFields form={form} setForm={setForm} showErrors={showErrors} />
            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
            <button
              onClick={submit}
              disabled={pending || !form.fullName.trim()}
              className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save employee"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function EmployeeProfileButton({ employee }: { employee: EmployeeRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EmployeeInput>(blankForm(employee));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  function submit() {
    setError("");
    setShowErrors(true);
    if (formInvalid(form)) return;
    startTransition(async () => {
      const res = await updateEmployeeAction(employee.id, form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Profile updated");
      setOpen(false);
      router.refresh();
    });
  }

  function deactivate() {
    startTransition(async () => {
      const res = await deactivateEmployeeAction(employee.id);
      showToast(
        res.ok ? `${employee.fullName} marked inactive — login disabled${res.warning ? `. ${res.warning}` : ""}` : res.error
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2">
        Profile
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[420px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h2 className="text-[16.5px] font-extrabold m-0">{employee.fullName}</h2>
              <button onClick={() => setOpen(false)} className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>
            <EmployeeFields form={form} setForm={setForm} showErrors={showErrors} />
            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={pending}
                className="flex-1 btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={deactivate}
                disabled={pending}
                title="Mark inactive"
                className="border border-line cursor-pointer rounded-full w-11 h-11 flex items-center justify-center bg-white text-red disabled:opacity-60"
              >
                <UserX size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
