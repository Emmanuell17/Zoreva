export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export function hasFieldErrors(
  errors: FieldErrors,
): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}

export function validateRequired(
  value: string,
  label: string,
): string | undefined {
  if (!value.trim()) {
    return `${label} is required.`;
  }
  return undefined;
}

export function validateDate(value: string): string | undefined {
  const required = validateRequired(value, "Date");
  if (required) return required;

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Enter a valid date.";
  }

  return undefined;
}

export function validateFutureDate(value: string): string | undefined {
  const invalid = validateDate(value);
  if (invalid) return invalid;

  const selected = new Date(`${value}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selected < today) {
    return "Date cannot be in the past.";
  }

  return undefined;
}

export function validateTime(value: string, label = "Time"): string | undefined {
  return validateRequired(value, label);
}

export function validateTimeRange(
  startTime: string,
  endTime: string,
): FieldErrors<"startTime" | "endTime"> {
  const errors: FieldErrors<"startTime" | "endTime"> = {
    startTime: validateTime(startTime, "Start time"),
    endTime: validateTime(endTime, "End time"),
  };

  if (!errors.startTime && !errors.endTime && startTime >= endTime) {
    errors.endTime = "End time must be after start time.";
  }

  return errors;
}

export function validateOptionalNote(
  value: string,
  maxLength = 200,
): string | undefined {
  if (value.trim().length > maxLength) {
    return `Note must be ${maxLength} characters or fewer.`;
  }
  return undefined;
}

export function validateOptionalMessage(
  value: string,
  maxLength = 200,
): string | undefined {
  if (value.trim().length > maxLength) {
    return `Message must be ${maxLength} characters or fewer.`;
  }
  return undefined;
}
