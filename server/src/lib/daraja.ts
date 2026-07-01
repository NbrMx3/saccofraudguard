interface StkPushInput {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface StkPushResult {
  attempted: boolean;
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseCode?: string;
}

function getTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("7")) {
    return `254${digits}`;
  }

  return digits;
}

function getDarajaConfig() {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
  const shortCode = process.env.DARAJA_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  const callbackUrl = process.env.DARAJA_CALLBACK_URL;
  const transactionType = process.env.DARAJA_TRANSACTION_TYPE || "CustomerPayBillOnline";
  const baseUrl = process.env.DARAJA_BASE_URL || "https://sandbox.safaricom.co.ke";

  if (!consumerKey || !consumerSecret || !shortCode || !passkey || !callbackUrl) {
    return null;
  }

  return {
    consumerKey,
    consumerSecret,
    shortCode,
    passkey,
    callbackUrl,
    transactionType,
    baseUrl,
  };
}

async function getAccessToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!tokenResponse.ok) {
    throw new Error(`Daraja token request failed with status ${tokenResponse.status}`);
  }

  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenBody.access_token) {
    throw new Error("Daraja token response did not include access_token");
  }

  return tokenBody.access_token;
}

export async function initiateStkPush(input: StkPushInput): Promise<StkPushResult> {
  const config = getDarajaConfig();

  if (!config) {
    return {
      attempted: false,
      success: false,
      message: "Daraja STK push skipped: missing required Daraja environment variables",
    };
  }

  try {
    const accessToken = await getAccessToken(config.baseUrl, config.consumerKey, config.consumerSecret);
    const timestamp = getTimestamp();
    const password = Buffer.from(`${config.shortCode}${config.passkey}${timestamp}`).toString("base64");
    const phoneNumber = normalizeKenyanPhone(input.phoneNumber);
    const amount = Math.max(1, Math.round(input.amount));

    const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        BusinessShortCode: config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: config.transactionType,
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: config.shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: config.callbackUrl,
        AccountReference: input.accountReference,
        TransactionDesc: input.transactionDesc,
      }),
    });

    const responseBody = (await response.json()) as {
      ResponseCode?: string;
      ResponseDescription?: string;
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      errorMessage?: string;
    };

    if (!response.ok) {
      return {
        attempted: true,
        success: false,
        message: responseBody.errorMessage || responseBody.ResponseDescription || "Daraja STK push request failed",
      };
    }

    const success = responseBody.ResponseCode === "0";
    return {
      attempted: true,
      success,
      message: responseBody.ResponseDescription || (success ? "STK push request sent" : "STK push request not accepted"),
      checkoutRequestId: responseBody.CheckoutRequestID,
      merchantRequestId: responseBody.MerchantRequestID,
      responseCode: responseBody.ResponseCode,
    };
  } catch (error) {
    console.error("Daraja STK push error:", error);
    return {
      attempted: true,
      success: false,
      message: "Daraja STK push failed due to a network or configuration error",
    };
  }
}
