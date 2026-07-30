import { useState, useId, type ChangeEvent } from 'react';
import { formatPhoneNumber } from '../utils/format';

interface PhoneNumberInputProps {
  label: string;
  value: string; // 数字のみの生値(例: "09012345678")
  onChange: (digits: string) => void;
  required?: boolean;
}

/**
 * 電話番号入力欄。
 * 数字以外は入力させず、フォーカスを外すと「090-1234-5678」のように自動整形する。
 * 入力中は生の数字のまま編集できるようにし、カーソル位置のジャンプを防ぐ。
 */
export default function PhoneNumberInput({
  label,
  value,
  onChange,
  required,
}: PhoneNumberInputProps) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    onChange(digitsOnly);
  }

  const displayValue = isFocused || value === '' ? value : formatPhoneNumber(value);

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-lumina-pink-deep"> *</span>}
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={displayValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={handleChange}
        placeholder="090-1234-5678"
        className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                   text-base text-ink outline-none transition-colors
                   focus:border-lumina-pink-deep focus:ring-2 focus:ring-lumina-pink/40"
      />
    </div>
  );
}
