import { revalidatePath } from "next/cache";
import { authenticateIngestionRequest } from "@/lib/automation/ingestion-auth";
import { reconcileAccountsFromMessageHistory } from "@/lib/automation/history-reconciliation";

export async function POST(request: Request) {
  const integration = await authenticateIngestionRequest(request);
  if (!integration) {
    return Response.json({ error: "Invalid ingestion token" }, { status: 401 });
  }

  try {
    const result = await reconcileAccountsFromMessageHistory(integration.userId);
    revalidatePath("/automations");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return Response.json(result);
  } catch (error) {
    console.error("Mobile message history reconciliation failed", error);
    return Response.json({ error: "Unable to reconcile account balances" }, { status: 500 });
  }
}
