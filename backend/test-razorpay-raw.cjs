
require("dotenv").config();

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

async function test() {
  if (!keyId || !keySecret) {
    console.log("Credentials missing");
    return;
  }

  const auth = Buffer
    .from(`${keyId}:${keySecret}`)
    .toString("base64");

  try {
    const response = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 9900,
          currency: "INR",
          receipt: `raw_test_${Date.now()}`,
        }),
      }
    );

    const data = await response.json();

    console.log("HTTP STATUS:", response.status);
    console.log("RESPONSE:", data);

    if (response.ok) {
      console.log("RAW AUTHENTICATION SUCCESS");
      console.log("ORDER ID:", data.id);
    } else {
      console.log("RAW AUTHENTICATION FAILED");
    }
  } catch (error) {
    console.log("NETWORK ERROR:", error.message);
  }
}

test();

