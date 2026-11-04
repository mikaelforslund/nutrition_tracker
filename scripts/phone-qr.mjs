// Prints a QR code for a URL and saves it as phone-qr.png.
import QRCode from "qrcode";

const url = process.argv[2];

console.log(await QRCode.toString(url, { type: "terminal", small: true }));
await QRCode.toFile("phone-qr.png", url, { width: 600, margin: 2 });
