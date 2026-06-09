"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/finance/money-input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

type VariableKey = "a" | "b" | "c" | "d";

const PRESET_FORMULAS = [
  { id: "surplus", label: "Surplus (A − B)", expression: "a - b" },
  { id: "annual", label: "Annual (A × 12)", expression: "a * 12" },
  { id: "pct", label: "Percent of A (A × B ÷ 100)", expression: "a * b / 100" },
  { id: "compound", label: "After return ((A + B) × (1 + C ÷ 100))", expression: "(a + b) * (1 + c / 100)" },
] as const;

const DEFAULT_LABELS: Record<VariableKey, string> = {
  a: "Income (₹/mo)",
  b: "Expenses (₹/mo)",
  c: "Rate (%)",
  d: "Extra (₹)",
};

function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = "";

  for (const char of expression.toLowerCase()) {
    if ("abcd0123456789.".includes(char)) {
      current += char;
      continue;
    }
    if (current) {
      tokens.push(current);
      current = "";
    }
    if ("+-*/()".includes(char)) {
      tokens.push(char);
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function evaluateExpression(
  expression: string,
  variables: Record<VariableKey, number>
): { value: number | null; error?: string } {
  const tokens = tokenize(expression);
  if (tokens.length === 0) return { value: null, error: "Enter a formula" };

  let index = 0;

  function parsePrimary(): number {
    const token = tokens[index];
    if (token === "(") {
      index += 1;
      const value = parseAddSub();
      if (tokens[index] !== ")") throw new Error("Missing closing parenthesis");
      index += 1;
      return value;
    }
    if (token === "-") {
      index += 1;
      return -parsePrimary();
    }
    if (token === "+") {
      index += 1;
      return parsePrimary();
    }
    index += 1;
    if (token in variables) return variables[token as VariableKey];
    const num = Number(token);
    if (Number.isFinite(num)) return num;
    throw new Error(`Unknown token: ${token}`);
  }

  function parseMulDiv(): number {
    let value = parsePrimary();
    while (index < tokens.length && (tokens[index] === "*" || tokens[index] === "/")) {
      const op = tokens[index];
      index += 1;
      const right = parsePrimary();
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseAddSub(): number {
    let value = parseMulDiv();
    while (index < tokens.length && (tokens[index] === "+" || tokens[index] === "-")) {
      const op = tokens[index];
      index += 1;
      const right = parseMulDiv();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  try {
    const result = parseAddSub();
    if (index < tokens.length) throw new Error("Invalid formula");
    if (!Number.isFinite(result)) throw new Error("Result is not a number");
    return { value: result };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : "Invalid formula",
    };
  }
}

export function TempPlannerCalculator({
  defaultValues,
}: {
  defaultValues?: Partial<Record<VariableKey, number>>;
}) {
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [values, setValues] = useState<Record<VariableKey, string>>({
    a: defaultValues?.a != null ? String(defaultValues.a) : "",
    b: defaultValues?.b != null ? String(defaultValues.b) : "",
    c: defaultValues?.c != null ? String(defaultValues.c) : "12",
    d: defaultValues?.d != null ? String(defaultValues.d) : "",
  });
  const [formula, setFormula] = useState("a - b");
  const [savedFormulas, setSavedFormulas] = useState<Array<{ name: string; expression: string }>>(
    []
  );
  const [saveName, setSaveName] = useState("");

  const numericVars = useMemo(
    () =>
      ({
        a: Number(values.a) || 0,
        b: Number(values.b) || 0,
        c: Number(values.c) || 0,
        d: Number(values.d) || 0,
      }) satisfies Record<VariableKey, number>,
    [values]
  );

  const result = useMemo(
    () => evaluateExpression(formula, numericVars),
    [formula, numericVars]
  );

  function saveFormula() {
    const name = saveName.trim();
    if (!name || !formula.trim()) return;
    setSavedFormulas((prev) => [...prev.filter((f) => f.name !== name), { name, expression: formula }]);
    setSaveName("");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Variables</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use A, B, C, D in your formulas. Nothing is saved — scratch pad only.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(DEFAULT_LABELS) as VariableKey[]).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`var-label-${key}`}>
                {key.toUpperCase()} label
              </Label>
              <Input
                id={`var-label-${key}`}
                value={labels[key]}
                onChange={(e) => setLabels((p) => ({ ...p, [key]: e.target.value }))}
              />
              <MoneyInput
                id={`var-value-${key}`}
                value={values[key]}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={key === "c" ? "e.g. 12" : "0"}
                allowNegative={key !== "c"}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Custom formula</CardTitle>
          <p className="text-sm text-muted-foreground">
            Operators: + − × ÷ and parentheses. Reference variables as a, b, c, d.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_FORMULAS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormula(preset.expression)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="formula">Expression</Label>
            <Input
              id="formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g. (a - b) * 12"
              className="font-mono"
            />
          </div>

          <div className="rounded-lg bg-muted/50 px-4 py-4">
            <p className="text-sm text-muted-foreground">Result</p>
            {result.error ? (
              <p className="mt-1 text-sm text-destructive">{result.error}</p>
            ) : (
              <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
                {formatINR(result.value ?? 0)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="save-name">Save this formula locally</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Monthly FIRE gap"
              />
            </div>
            <Button type="button" variant="secondary" onClick={saveFormula}>
              Save to browser
            </Button>
          </div>

          {savedFormulas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {savedFormulas.map((item) => (
                <Button
                  key={item.name}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="border border-border"
                  onClick={() => setFormula(item.expression)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
