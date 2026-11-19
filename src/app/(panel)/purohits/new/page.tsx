"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Flame, Key, Mail, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import { PurohitAvatarUploader } from "@/components/purohits/purohit-avatar-uploader";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { adminPurohitApi, type PurohitCreatedData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function NewPurohitPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    display_name: "",
    email: "",
    phone: "",
    title: "Vedic Acharya",
    bio: "",
    avatar_url: "",
    address: "",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
    experience_years: 10,
    languages: ["Bengali", "Sanskrit"],
  });

  const [createdData, setCreatedData] = React.useState<PurohitCreatedData | null>(null);
  const [credentialsModalOpen, setCredentialsModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await adminPurohitApi.create(payload);
      const data = ((res as any)?.data !== undefined ? (res as any).data : res) as PurohitCreatedData;
      return data;
    },
    onSuccess: (data) => {
      setCreatedData(data);
      setCredentialsModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ["admin_purohits"] });
      toast.success("Purohit created successfully!");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to create Purohit account";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please enter first name, email, and phone number.");
      return;
    }
    createMutation.mutate(form);
  };

  const handleCopyCredentials = () => {
    if (!createdData) return;
    const text = `DivinLink Purohit Login Credentials:\nPortal: https://admin.divinlink.com/login\nEmail: ${createdData.email}\nPassword: ${createdData.temporary_password}\n(Change your password after first login)`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Login credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseModal = () => {
    setCredentialsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin_purohits"] });
    router.push("/purohits");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PanelHeader
        title="Onboard New Vedic Purohit"
        description="Register a verified Purohit. The system will auto-generate secure login credentials and email them to the Purohit."
        action={
          <Link href="/purohits">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4 mr-1.5" />
              Back to Purohits
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal & Vedic Title */}
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Flame className="size-4 text-amber-600" />
              <span>Purohit Identity & Sacred Title</span>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="First Name *">
                <Input
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="e.g. Debabrata"
                />
              </Field>
              <Field label="Middle Name">
                <Input
                  value={form.middle_name}
                  onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                  placeholder="e.g. Kumar"
                />
              </Field>
              <Field label="Last Name">
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="e.g. Bhattacharya"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Display Name (Public Name)" hint="Shown to devotees on website & booking altar">
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="e.g. Acharya Debabrata Shastri"
                />
              </Field>
              <Field label="Vedic Title / Qualification">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Vedic Acharya / Purohit Ratna"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email Address *" hint="Purohit will use this email to log in at admin.divinlink.com/login">
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="purohit@example.com"
                />
              </Field>
              <Field label="Mobile Phone Number *" hint="For urgent booking notifications">
                <Input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* Location & Experience */}
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-amber-600" />
              <span>Location, Languages & Experience</span>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Kolkata / Varanasi"
                />
              </Field>
              <Field label="State">
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="West Bengal / UP"
                />
              </Field>
              <Field label="Pincode">
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="700001"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Experience (Years)">
                <Input
                  type="number"
                  value={form.experience_years}
                  onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) || 0 })}
                  placeholder="10"
                />
              </Field>

              <Field label="Languages (comma separated)">
                <Input
                  value={form.languages.join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Bengali, Sanskrit, Hindi"
                />
              </Field>
            </div>

            <PurohitAvatarUploader
              value={form.avatar_url}
              onChange={(url) => setForm({ ...form, avatar_url: url })}
              name={`${form.first_name} ${form.last_name}`.trim() || form.display_name || "Purohit"}
            />

            <Field label="Sacred Bio & Parampara (Lineage)">
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="Vedic Purohit trained in Kashi Toll tradition with 15+ years of chanting experience in Lakshmi Puja, Satyanarayan, and Griha Pravesh..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-xs focus:border-amber-600 focus:outline-none"
              />
            </Field>
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/purohits">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            type="submit"
            loading={createMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6"
          >
            <Sparkles className="size-4 mr-1.5" />
            Create Purohit & Send Credentials
          </Button>
        </div>
      </form>

      {/* Credentials Modal upon successful creation */}
      {createdData && (
        <Modal
          open={credentialsModalOpen}
          onClose={handleCloseModal}
          title="🎉 Purohit Account Created Successfully"
        >
          <div className="space-y-4 p-2">
            <p className="text-xs text-stone-600 dark:text-stone-300">
              An account with role <b>purohit</b> has been registered. The Purohit can now sign in at the official portal:
            </p>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-[10px] text-amber-800 dark:text-amber-400 uppercase font-bold block">
                  Login URL:
                </span>
                <span className="font-bold text-stone-900 dark:text-white">
                  https://admin.divinlink.com/login
                </span>
              </div>

              <div>
                <span className="text-[10px] text-amber-800 dark:text-amber-400 uppercase font-bold block">
                  Email (Username):
                </span>
                <span className="font-bold text-stone-900 dark:text-white">
                  {createdData.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-amber-800 dark:text-amber-400 uppercase font-bold block">
                  Temporary Password:
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-400 text-base">
                  {createdData.temporary_password}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span>{createdData.email_sent ? "✅ Credentials sent via email" : "⚠️ Email failed, please copy password"}</span>
              <Button variant="outline" size="sm" onClick={handleCopyCredentials} className="text-xs font-bold">
                {copied ? <Check className="size-3.5 mr-1 text-emerald-600" /> : <Copy className="size-3.5 mr-1" />}
                {copied ? "Copied" : "Copy Credentials"}
              </Button>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleCloseModal}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                Go to Purohits Directory
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
