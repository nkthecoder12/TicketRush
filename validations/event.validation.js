
export const validateCreateEvent = (body) => {
  const {
    title,
    description,
    category,
    venue,
    start_date,
    end_date,
    price,
    total_tickets
  } = body;

  // 1. Validate required text fields
  for (const [field, value] of Object.entries({
    title,
    category,
    venue
  })) {
    if (typeof value !== "string" || !value.trim()) {
      return `${field} is required`;
    }
  }

  // 2. Validate description
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return "Description must be a string";
  }

  // 3. Validate dates
  const start = new Date(start_date);
  const end = new Date(end_date);

  if (
    typeof start_date !== "string" ||
    typeof end_date !== "string" ||
    !start_date ||
    !end_date ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return "Valid start_date and end_date are required";
  }

  if (end <= start) {
    return "end_date must be after start_date";
  }

  // 4. Validate price
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return "Price must be a non-negative number";
  }

  // 5. Validate ticket capacity
  if (
    typeof total_tickets !== "number" ||
    !Number.isInteger(total_tickets) ||
    total_tickets <= 0
  ) {
    return "total_tickets must be a positive integer";
  }

  // No validation errors
  return null;
};
