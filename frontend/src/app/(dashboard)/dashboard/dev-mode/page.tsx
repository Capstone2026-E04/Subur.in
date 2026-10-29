import PageHeader from "@/components/dashboard/PageHeader";
import DeveloperModeControl from "@/components/dashboard/DeveloperModeControl";
export default function DevModePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <PageHeader
        title="Developer Mode"
        description="Uji pemantauan tanaman menggunakan simulasi sensor yang tersedia."
      />
      <DeveloperModeControl />
    </div>
  );
}
