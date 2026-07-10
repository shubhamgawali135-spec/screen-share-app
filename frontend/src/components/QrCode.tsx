"use client";

import { QRCodeSVG } from "qrcode.react";

interface QrCodeProps {
  value: string;
  size?: number;
}

export default function QrCode({ value, size = 176 }: QrCodeProps) {
  return (
    <div className="inline-flex items-center justify-center rounded-md bg-ink p-3">
      <QRCodeSVG value={value} size={size} bgColor="#E6EDF3" fgColor="#0B0F14" level="M" />
    </div>
  );
}
