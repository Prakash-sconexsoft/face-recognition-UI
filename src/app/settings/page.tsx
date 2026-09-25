import { KeyRound, Link2 } from "lucide-react";
import { RecognitionSettingsCard } from "@/components/settings/RecognitionSettingsCard";
import { PageHeader } from "@/components/ui/PageHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const HAS_API_KEY = Boolean(process.env.NEXT_PUBLIC_API_KEY);

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Admin configuration for recognition and the backend connection."
      />

      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Admin Settings
      </h2>
      <RecognitionSettingsCard />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Backend Connection
      </h2>
      <div className="space-y-4">
        <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Link2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              API Base URL
            </p>
            <p className="mt-1 break-all font-mono text-sm text-slate-500">
              {API_BASE_URL || "Not configured"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Set via the NEXT_PUBLIC_API_BASE_URL environment variable.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">API Key</p>
            <p className="mt-1 text-sm text-slate-500">
              {HAS_API_KEY
                ? "Configured — sent as the X-API-Key header on every request."
                : "Not configured. Requests are sent without an X-API-Key header."}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Set via the NEXT_PUBLIC_API_KEY environment variable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
