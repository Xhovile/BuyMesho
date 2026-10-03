import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "der" },
});

console.log("# Add the private key only to the BuyMesho server secret store.");
console.log(`BUYMESHO_TICKET_SIGNING_KEY_ID="buymesho-ticket-2026"`);
console.log(`BUYMESHO_TICKET_SIGNING_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"`);
console.log(`VITE_BUYMESHO_TICKET_PUBLIC_KEY="${publicKey.toString("base64")}"`);
