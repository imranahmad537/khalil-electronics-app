"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus, Power, RefreshCw, X } from "lucide-react";
import {
  changeOwnPasswordAction,
  createLoginAction,
  resetPasswordAction,
  setLoginActiveAction,
} from "@/app/actions/logins";
import { ROLE_LABEL, ASSIGNABLE_ROLES } from "@/lib/roles";
import { generatePassword, normalizeUsername, passwordError, usernameError } from "@/lib/staff-login";
import { enterToNextField } from "@/lib/enter-to-next";
import { showToast } from "@/lib/toast";
import type { UserRole } from "@/lib/types";
import type { EmployeeWithoutLogin, LoginRow } from "@/lib/data/logins";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";
const errCls = "text-[11px] font-semibold text-red";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[440px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[16.5px] font-extrabold m-0">{title}</h2>
          <button onClick={onClose} className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>Password</label>
      <div className="flex gap-2">
        <input className={`${inputCls} flex-1 font-mono`} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" />
        <button
          type="button"
          onClick={() => onChange(generatePassword())}
          className="border border-line cursor-pointer rounded-xl px-3 flex items-center gap-1 text-[12px] font-bold bg-white text-g700"
          title="Generate an easy-to-read password"
        >
          <RefreshCw size={13} strokeWidth={2.6} />
          Generate
        </button>
      </div>
      {error && <span className={errCls}>{error}</span>}
    </div>
  );
}

/** Shown once after creating a login or resetting a password — what to tell the person. */
function CredentialsCard({ name, loginId, password, onDone }: { name: string; loginId: string; password: string; onDone: () => void }) {
  const text = `Khalil Electronics login\nUsername: ${loginId}\nPassword: ${password}`;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[12.5px] text-ink2">Give these to {name}. The password is shown only now — it can be reset later if lost.</p>
      <div className="rounded-2xl bg-g900 text-white p-4 flex flex-col gap-2 font-mono text-[14px]">
        <div>
          <span className="text-white/60">Username: </span>
          {loginId}
        </div>
        <div>
          <span className="text-white/60">Password: </span>
          {password}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              showToast("Copied — paste it into WhatsApp or SMS");
            } catch {
              showToast("Couldn't copy — write it down instead");
            }
          }}
          className="flex-1 border border-line cursor-pointer rounded-full py-3 flex items-center justify-center gap-2 text-[13px] font-bold bg-white text-g700"
        >
          <Copy size={14} strokeWidth={2.4} />
          Copy
        </button>
        <button onClick={onDone} className="flex-1 btnp border-0 cursor-pointer rounded-full py-3 text-[13px] font-bold bg-g500 text-white">
          Done
        </button>
      </div>
    </div>
  );
}

export function AddLoginDialog({ employees, canCreateOwner }: { employees: EmployeeWithoutLogin[]; canCreateOwner: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("sales");
  const [zone, setZone] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; loginId: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const roles = ASSIGNABLE_ROLES.filter((r) => r !== "owner" || canCreateOwner);
  const uErr = tried ? usernameError(username) : null;
  const pErr = tried ? passwordError(password) : null;

  function reset() {
    setEmployeeId("");
    setFullName("");
    setUsername("");
    setPassword(generatePassword());
    setRole("sales");
    setZone("");
    setTried(false);
    setError("");
    setDone(null);
  }

  function pickEmployee(id: string) {
    setEmployeeId(id);
    const e = employees.find((x) => x.id === id);
    if (e) {
      setFullName(e.fullName);
      setRole(e.role === "owner" && !canCreateOwner ? "sales" : e.role);
      if (!username) setUsername(normalizeUsername(e.fullName.split(" ")[0] ?? ""));
    }
  }

  function submit() {
    setTried(true);
    setError("");
    if (!fullName.trim() || usernameError(username) || passwordError(password)) return;
    startTransition(async () => {
      const res = await createLoginAction({ employeeId: employeeId || null, fullName, username, password, role, zone });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone({ name: fullName.trim(), loginId: res.username ?? normalizeUsername(username), password });
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
      >
        <Plus size={16} strokeWidth={2.4} />
        Add login
      </button>
      {open && (
        <Modal title={done ? "Login created" : "Add login"} onClose={() => setOpen(false)}>
          {done ? (
            <CredentialsCard {...done} onDone={() => setOpen(false)} />
          ) : (
            <div className="flex flex-col gap-3" onKeyDown={enterToNextField}>
              {employees.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Employee</label>
                  <select className={inputCls} value={employeeId} onChange={(e) => pickEmployee(e.target.value)}>
                    <option value="">New person (not in Employees yet)</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} · {ROLE_LABEL[e.role]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Full name</label>
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                {tried && !fullName.trim() && <span className={errCls}>Required</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Role</label>
                  <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Username</label>
                  <input
                    className={inputCls}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="e.g. waqas"
                    autoComplete="off"
                  />
                </div>
              </div>
              {uErr && <span className={errCls}>Username: {uErr}</span>}
              {role === "avo" && (
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Areas (zone)</label>
                  <input className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. Hayatabad, Tehkal" />
                </div>
              )}
              <PasswordField value={password} onChange={setPassword} error={pErr} />
              {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
              <button
                onClick={submit}
                disabled={pending}
                className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
              >
                {pending ? "Creating…" : "Create login"}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export function ResetPasswordButton({ row }: { row: LoginRow }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setTried(true);
    setError("");
    if (passwordError(password)) return;
    startTransition(async () => {
      const res = await resetPasswordAction(row.id, password);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setPassword(generatePassword());
          setTried(false);
          setError("");
          setDone(false);
          setOpen(true);
        }}
        className="border border-line cursor-pointer rounded-full px-[12px] py-[7px] flex items-center gap-1 text-xs font-bold bg-white text-ink2"
      >
        <KeyRound size={13} strokeWidth={2.4} />
        Reset password
      </button>
      {open && (
        <Modal title={done ? "Password reset" : `Reset password · ${row.fullName}`} onClose={() => setOpen(false)}>
          {done ? (
            <CredentialsCard name={row.fullName} loginId={row.loginId} password={password} onDone={() => setOpen(false)} />
          ) : (
            <>
              <PasswordField value={password} onChange={setPassword} error={tried ? passwordError(password) : null} />
              {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
              <button
                onClick={submit}
                disabled={pending}
                className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : "Set new password"}
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

export function ToggleLoginButton({ row }: { row: LoginRow }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await setLoginActiveAction(row.id, !row.active);
      showToast(res.ok ? `${row.fullName}'s login is now ${row.active ? "off" : "on"}` : res.error);
      setConfirm(false);
      router.refresh();
    });
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1">
        <button onClick={run} disabled={pending} className="rounded-full px-[12px] py-[7px] text-xs font-bold bg-red text-white disabled:opacity-60">
          {pending ? "…" : "Turn off"}
        </button>
        <button onClick={() => setConfirm(false)} className="rounded-full px-[12px] py-[7px] text-xs font-bold border border-line bg-white text-ink2">
          Keep
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => (row.active ? setConfirm(true) : run())}
      disabled={pending}
      className={`border border-line cursor-pointer rounded-full px-[12px] py-[7px] flex items-center gap-1 text-xs font-bold bg-white disabled:opacity-60 ${row.active ? "text-red" : "text-g700"}`}
    >
      <Power size={13} strokeWidth={2.4} />
      {row.active ? "Turn off" : "Turn on"}
    </button>
  );
}

export function ChangeMyPasswordButton() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const pErr = tried ? passwordError(password) : null;
  const mismatch = tried && password !== confirmPw;

  function submit() {
    setTried(true);
    setError("");
    if (passwordError(password) || password !== confirmPw) return;
    startTransition(async () => {
      const res = await changeOwnPasswordAction(password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Your password was changed");
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setPassword("");
          setConfirmPw("");
          setTried(false);
          setError("");
          setOpen(true);
        }}
        className="border border-line cursor-pointer rounded-full px-[18px] py-3 flex items-center gap-2 text-[13px] font-bold bg-white text-ink2"
      >
        <KeyRound size={15} strokeWidth={2.4} />
        Change my password
      </button>
      {open && (
        <Modal title="Change my password" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3" onKeyDown={enterToNextField}>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>New password</label>
              <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              {pErr && <span className={errCls}>{pErr}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Type it again</label>
              <input type="password" className={inputCls} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
              {mismatch && <span className={errCls}>The two passwords don&apos;t match</span>}
            </div>
            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
            <button
              onClick={submit}
              disabled={pending}
              className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Change password"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
