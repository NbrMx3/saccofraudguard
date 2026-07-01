import express, { type Request, type Response } from "express";
import prisma from "../lib/prisma.js";
import { consumeTransactionIdForCheckout } from "../lib/daraja.js";

const router: express.Router = express.Router();

interface DarajaCallbackItem {
  Name: string;
  Value?: string | number;
}

interface DarajaStkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: DarajaCallbackItem[];
      };
    };
  };
}

function getMetadataValue(items: DarajaCallbackItem[] | undefined, name: string): string | number | null {
  if (!items) return null;
  const item = items.find((x) => x.Name === name);
  return item?.Value ?? null;
}

router.post("/daraja/callback", async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as DarajaStkCallbackBody;
  const callback = payload?.Body?.stkCallback;

  if (!callback) {
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    return;
  }

  const checkoutRequestId = callback.CheckoutRequestID || "";
  const merchantRequestId = callback.MerchantRequestID || "";
  const resultCode = callback.ResultCode ?? -1;
  const resultDesc = callback.ResultDesc || "No description";
  const metadata = callback.CallbackMetadata?.Item;

  const amount = getMetadataValue(metadata, "Amount");
  const mpesaReceipt = getMetadataValue(metadata, "MpesaReceiptNumber");
  const phoneNumber = getMetadataValue(metadata, "PhoneNumber");
  const transactionDate = getMetadataValue(metadata, "TransactionDate");

  const localTransactionId = checkoutRequestId
    ? consumeTransactionIdForCheckout(checkoutRequestId)
    : null;

  try {
    if (localTransactionId) {
      await prisma.transaction.update({
        where: { id: localTransactionId },
        data: {
          status: resultCode === 0 ? "COMPLETED" : "FAILED",
          description: resultCode === 0
            ? `M-Pesa STK success${mpesaReceipt ? ` (${String(mpesaReceipt)})` : ""}`
            : `M-Pesa STK failed (${resultDesc})`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "DARAJA_STK_CALLBACK",
        entity: "TRANSACTION",
        entityId: localTransactionId || undefined,
        details: JSON.stringify({
          checkoutRequestId,
          merchantRequestId,
          resultCode,
          resultDesc,
          amount,
          mpesaReceipt,
          phoneNumber,
          transactionDate,
          matchedLocalTransaction: Boolean(localTransactionId),
        }),
      },
    });
  } catch (error) {
    console.error("Daraja callback processing error:", error);
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

export default router;
