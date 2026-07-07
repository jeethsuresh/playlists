import { Suspense } from "react";
import SettingsForm from "./settings-form";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsForm />
    </Suspense>
  );
}
