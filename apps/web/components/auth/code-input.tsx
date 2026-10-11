"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";

const slots = [0, 1, 2, 3, 4, 5];

/** The 6-digit code field shared by email verification and password reset. */
export function CodeInput({
    invalid,
    ...props
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    autoFocus?: boolean;
    invalid?: boolean;
    "aria-describedby"?: string;
    ref?: React.Ref<HTMLInputElement>;
}) {
    return (
        <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            // A code copied as "123 456" or with its sentence still pastes.
            pasteTransformer={(text) => text.replace(/\D/g, "")}
            aria-invalid={invalid || undefined}
            containerClassName="w-full"
            {...props}
        >
            <InputOTPGroup className="w-full">
                {slots.map((index) => (
                    <InputOTPSlot
                        key={index}
                        index={index}
                        aria-invalid={invalid || undefined}
                        className="h-10 w-auto flex-1 text-base"
                    />
                ))}
            </InputOTPGroup>
        </InputOTP>
    );
}
