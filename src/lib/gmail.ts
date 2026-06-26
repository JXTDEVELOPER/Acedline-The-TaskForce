/**
 * Encodes unicode strings safe for base64 conversions in modern browsers.
 */
function safeB64(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.byteLength; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
}

/**
 * Builds and encodes an standard email message to Base64URL.
 */
export function buildGmailRawMessage(to: string, subject: string, bodyHtml: string): string {
  const utf8Subject = `=?utf-8?B?${safeB64(subject)}?=`;
  const emailLines = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    safeB64(bodyHtml),
  ];
  const fullEmail = emailLines.join("\r\n");
  
  // Convert standard Base64 to web-safe Base64url (replace '+' with '-', '/' with '_', and strip '=')
  return safeB64(fullEmail)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends a raw encoded email via Google Gmail API.
 */
export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  bodyHtml: string
): Promise<any> {
  const rawMessage = buildGmailRawMessage(to, subject, bodyHtml);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: rawMessage,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gmail API Send Error Details:", errorText);
    throw new Error(`Gmail API failure: ${response.statusText}`);
  }

  return response.json();
}
