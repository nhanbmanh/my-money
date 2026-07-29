import type { NextRequest } from "next/server";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Hàm gửi tin nhắn qua Messenger API
async function sendMessage(psid: string, text: string) {
  await fetch(
    `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text },
      }),
    },
  );
}

// Xử lý GET (verify webhook)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Xử lý POST (nhận sự kiện từ Messenger)
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      console.log("PSID:", senderId);

      // Gửi phản hồi tự động
      await sendMessage(senderId, "Cảm ơn bạn đã kết nối!");
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
}
