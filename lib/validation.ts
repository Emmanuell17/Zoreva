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

export function validateSlots(value: string): string | undefined {
  const required = validateRequired(value, "How many people");
  if (required) return required;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    return "Enter a number from 1 to 50.";
  }

  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const required = validateRequired(value, "Email");
  if (required) return required;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid email address.";
  }

  return undefined;
}

export function validateCount(
  value: string,
  label: string,
  min: number,
  max: number,
): string | undefined {
  const required = validateRequired(value, label);
  if (required) return required;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return `Enter a number from ${min} to ${max}.`;
  }

  return undefined;
}

export function parsePositions(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validatePositions(value: string): string | undefined {
  const positions = parsePositions(value);
  if (positions.length === 0) {
    return "Add at least one position. Example: Packer, Picker.";
  }
  if (positions.length > 12) {
    return "Keep it to 12 positions or fewer.";
  }
  return undefined;
}
