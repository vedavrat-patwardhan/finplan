import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { reconcileAccountsFromMessageHistory } from "@/lib/automation/history-reconciliation";

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await reconcileAccountsFromMessageHistory(session.userId);
    revalidatePath("/automations");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return Response.json(result);
  } catch (error) {
    console.error("Message history reconciliation failed", error);
    return Response.json({ error: "Unable to reconcile account balances" }, { status: 500 });
  }
}
