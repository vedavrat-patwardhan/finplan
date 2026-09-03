"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

export function CheckboxSwitchDemo() {
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="flex flex-wrap gap-10">
      <label className="flex cursor-pointer items-center gap-3">
        <Checkbox
          checked={autoCategorize}
          onCheckedChange={(checked) => setAutoCategorize(checked === true)}
        />
        <span className="text-sm font-medium">Auto-categorize transactions</span>
      </label>

      <label className="flex cursor-pointer items-center gap-3">
        <Switch checked={notifications} onCheckedChange={setNotifications} />
        <span className="text-sm font-medium">Enable budget alerts</span>
      </label>
    </div>
  );
}
