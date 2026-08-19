"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// A compact, regional list rather than the full ~200-country ISO set — this
// app's members are Riyadh-based (see CLAUDE.md's Asia/Riyadh timezone
// default) with the rest covering neighboring GCC countries plus a few
// common ones for members abroad.
export const COUNTRY_CODES = [
  { code: "+966", label: "Saudi Arabia" },
  { code: "+971", label: "UAE" },
  { code: "+965", label: "Kuwait" },
  { code: "+973", label: "Bahrain" },
  { code: "+974", label: "Qatar" },
  { code: "+968", label: "Oman" },
  { code: "+962", label: "Jordan" },
  { code: "+20", label: "Egypt" },
  { code: "+1", label: "US/Canada" },
  { code: "+44", label: "UK" },
] as const;

const DEFAULT_COUNTRY_CODE = "+966";

// Splits a stored E.164-ish value ("+966501234567") into dial code + local
// number for display. Falls back to the default country when the prefix
// isn't one of the codes above, rather than guessing.
export function splitPhone(value: string | null | undefined) {
  if (!value) return { countryCode: DEFAULT_COUNTRY_CODE, number: "" };
  const match = COUNTRY_CODES.find((c) => value.startsWith(c.code));
  if (!match) return { countryCode: DEFAULT_COUNTRY_CODE, number: value.replace(/^\+/, "") };
  return { countryCode: match.code, number: value.slice(match.code.length) };
}

// Country-code select + local number field, combined into one hidden input
// holding the full "+<code><number>" value under `name` — every caller's
// Server Action keeps reading a single `phone` field, unchanged.
export function PhoneInput({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
}) {
  const initial = splitPhone(defaultValue);
  const [countryCode, setCountryCode] = useState<string>(initial.countryCode);
  const [number, setNumber] = useState(initial.number);

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={number ? `${countryCode}${number}` : ""} />
      <Select value={countryCode} onValueChange={(next) => next && setCountryCode(next)}>
        <SelectTrigger className="w-24 shrink-0" aria-label="Country code">
          <SelectValue>{countryCode}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.label} ({country.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="501234567"
        value={number}
        onChange={(event) => setNumber(event.target.value.replace(/\D/g, ""))}
        className="flex-1"
      />
    </div>
  );
}
