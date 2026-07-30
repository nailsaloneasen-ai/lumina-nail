import { useState, useId, type ChangeEvent } from 'react';
import { formatCurrency } from '../utils/format';

interface CurrencyInputProps {
  label: string;
  value: number; // 円単位の数値
  onChange: (amount: number) => void;
  required?: boolean;
  /** 警告メッセージ(例: ポイントが施術金額を超えている場合) */
  warning?: string;
}

/**
 * 金額入力欄。
 * 数字以外は入力させず、フォーカスを外すと「¥8,000」のように自動整形する。
 */
export default function CurrencyInput({
  label,
  value,
  onChange,
  required,
  warning,
}: CurrencyInputProps) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    onChange(digitsOnly === '' ? 0 : Number(digitsOnly));
  }

  const displayValue = isFocused
    ? value === 0
      ? ''
      : String(value)
    : formatCurrency(value);

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-lumina-pink-deep"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={handleChange}
        placeholder="¥8,000"
        className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                   text-base text-ink outline-none transition-colors
                   focus:border-lumina-pink-deep focus:ring-2 focus:ring-lumina-pink/40"
      />
      {warning && <p className="text-xs text-lumina-pink-deep mt-1.5">{warning}</p>}
    </div>
  );
}
