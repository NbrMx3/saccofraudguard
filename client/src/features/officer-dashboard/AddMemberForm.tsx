import { useState, type FormEvent } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { createMember } from "@/services/memberService";
import { toast } from "sonner";

interface AddMemberFormProps {
  onMemberAdded: () => void;
}

export default function AddMemberForm({ onMemberAdded }: AddMemberFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      toast.error("Please enter first and last name");
      return;
    }

    setSubmitting(true);
    try {
      const { message, member } = await createMember({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      toast.success(`${message} — ID: ${member.memberId}`);
      setFullName("");
      setEmail("");
      setPhoneNumber("");
      setOpen(false);
      onMemberAdded();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error ?? "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:brightness-110"
      >
        <UserPlus className="h-4 w-4" />
        Add Member
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Add New Member</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Joshua Mwalimu"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="memberEmail"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Email
          </label>
          <input
            id="memberEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. joshua@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Phone Number
          </label>
          <input
            id="phoneNumber"
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 0712345678"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {submitting ? "Creating…" : "Create Member"}
        </button>
      </form>
    </div>
  );
}
