"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/ui/password-input";
import { MoneyInput } from "@/components/finance/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { DatePicker } from "@/components/ui/date-picker";

const ACCOUNT_OPTIONS = [
  { value: "salary", label: "Salary account" },
  { value: "savings", label: "Savings account" },
  { value: "credit-card", label: "Credit card" },
];

export function FormControlsDemo() {
  const [amount, setAmount] = useState("25000");
  const [account, setAccount] = useState("savings");
  const [date, setDate] = useState("");

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="pg-input-default">Goal name</Label>
        <Input id="pg-input-default" placeholder="e.g. house down payment" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-input-value">Full name</Label>
        <Input id="pg-input-value" defaultValue="Vedavrat Kulkarni" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-input-disabled">Account number</Label>
        <Input id="pg-input-disabled" defaultValue="XXXX-4821" disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-input-error">Monthly income</Label>
        <Input
          id="pg-input-error"
          defaultValue="0"
          aria-invalid
          aria-describedby="pg-input-error-message"
        />
        <p id="pg-input-error-message" className="text-xs text-destructive">
          Income must be greater than ₹0.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-money">Monthly SIP</Label>
        <MoneyInput
          id="pg-money"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-password">Password</Label>
        <PasswordInput id="pg-password" defaultValue="hunter2hunter2" />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="pg-textarea">Notes</Label>
        <Textarea
          id="pg-textarea"
          placeholder="Any context for this transaction…"
          defaultValue="Annual insurance premium, paid via net banking."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-select">Debit account</Label>
        <Select defaultValue="savings">
          <SelectTrigger id="pg-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-labeled-select">Category</Label>
        <LabeledSelect
          id="pg-labeled-select"
          value={account}
          onValueChange={setAccount}
          options={ACCOUNT_OPTIONS}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pg-date">Due date</Label>
        <DatePicker id="pg-date" value={date} onChange={setDate} />
      </div>
    </div>
  );
}
