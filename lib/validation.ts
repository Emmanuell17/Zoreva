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

export function validateName(value: string): string | undefined {
  const required = validateRequired(value, "Name");
  if (required) return required;

  if (value.trim().length < 2) {
    return "Name must be at least 2 characters.";
  }

  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const required = validateRequired(value, "Email");
  if (required) return required;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value.trim())) {
    return "Enter a valid email address.";
  }

  return undefined;
}

export function validatePassword(value: string): string | undefined {
  const required = validateRequired(value, "Password");
  if (required) return required;

  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Password must include letters and numbers.";
  }

  return undefined;
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string,
): string | undefined {
  const required = validateRequired(confirmPassword, "Confirm password");
  if (required) return required;

  if (password !== confirmPassword) {
    return "Passwords do not match.";
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
