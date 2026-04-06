"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type FormSubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  pendingLabel: string;
};

/**
 * React 19 + react-dom: 부모 <form>의 action 제출 중일 때 pending 을 반영한다.
 * (같은 form 트리 안에서만 useFormStatus 가 동작한다.)
 */
export function FormSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
