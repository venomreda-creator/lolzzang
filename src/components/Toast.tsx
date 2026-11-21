"use client";

import { Icon, type IconName } from "./Icons";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  success: "check",
  error: "alert",
  warning: "alert",
  info: "info",
};

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.tone}`}>
          <Icon name={TONE_ICON[item.tone]} size={16} className="toast-icon" />
          <span style={{ flex: 1 }}>{item.message}</span>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 20, height: 20, marginTop: -1 }}
            onClick={() => onDismiss(item.id)}
            aria-label="알림 닫기"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
