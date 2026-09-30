import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFinanceMessage } from "../src/lib/finance/message-parser";

test("Axis INR purchase uses the spend, not the available limit", () => {
  const parsed = parseFinanceMessage(
    "Spent INR 62716 Axis Bank Card no. XX8928 24-09-26 05:35:03 IST FLIPKART RA Avl Limit: INR 216908.3 Not you? SMS BLOCK 8928 to 919951860002"
  );
  assert.equal(parsed.kind, "transaction");
  assert.equal(parsed.amount, 62716);
  assert.equal(parsed.merchant, "FLIPKART RA");
  assert.equal(parsed.availableLimit, 216908.3);
});

test("Axis foreign-currency purchase never imports the INR available limit", () => {
  const parsed = parseFinanceMessage(
    "Spent USD 25 Axis Bank Card no. XX8928 24-09-26 17:03:41 IST GOOGLE SERV Avl Limit: INR 214514.3 Not you? SMS BLOCK 8928 to 919951860002"
  );
  assert.equal(parsed.kind, "transaction");
  assert.equal(parsed.amount, undefined);
  assert.equal(parsed.foreignCurrency, "USD");
  assert.equal(parsed.foreignAmount, 25);
  assert.equal(parsed.merchant, "GOOGLE SERV");
});

test("declined card attempts are not treated as payments", () => {
  const parsed = parseFinanceMessage(
    "Your transaction attempt for INR 62716 on Axis Bank Credit Card XX8928 was declined. No amount was spent."
  );
  assert.equal(parsed.kind, "unknown");
  assert.equal(parsed.amount, undefined);
});

test("HSBC email footer does not reverse a card-use debit", () => {
  const parsed = parseFinanceMessage(
    "HSBC Credit Card xx8673 was used for a transaction of INR 59.00 at SWIGGY PVT LTD FOOD1 on 23/09/26. This e-mail has been sent and received by the customer. Available limit INR 556310.79"
  );
  assert.equal(parsed.kind, "transaction");
  assert.equal(parsed.type, "debit");
  assert.equal(parsed.amount, 59);
  assert.equal(parsed.merchant, "SWIGGY PVT LTD FOOD1");
});

test("explicit EMI transaction is marked as an EMI purchase", () => {
  const parsed = parseFinanceMessage(
    "INR 2500 spent on card xx8928 at STORE as EMI on 24/09/26"
  );
  assert.equal(parsed.kind, "transaction");
  assert.equal(parsed.isEmi, true);
});

test("future EMI reminder does not create a debit", () => {
  const parsed = parseFinanceMessage(
    "EMI of INR 13308 for your loan account will be debited before 11.59 pm on 02-OCT-2026. Keep funds one day prior in account XXXXXX9883."
  );
  assert.equal(parsed.kind, "unknown");
  assert.equal(parsed.type, undefined);
});

test("conversion to EMI and promotional recent purchase are not new payments", () => {
  for (const message of [
    "Your purchase of INR 62716 on card XX8928 has been successfully converted into EMI.",
    "Your recent purchase of INR 2462 on card XX1234 is eligible for EMI. Convert your purchase now.",
  ]) {
    assert.equal(parseFinanceMessage(message).kind, "unknown");
  }
});

test("posted NACH debit remains a transaction", () => {
  const parsed = parseFinanceMessage(
    "INR 5,000.00 is debited from your Account XXXXXX9883 on 29/09/2026 towards NACH-MUT-JIOBL 29092026 CAM Kotak Bank"
  );
  assert.equal(parsed.kind, "transaction");
  assert.equal(parsed.type, "debit");
  assert.equal(parsed.amount, 5000);
});
