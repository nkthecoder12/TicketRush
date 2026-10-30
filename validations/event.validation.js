export const validateCreateEvent = (body) => {
  const {
    title,
    description,
    category,
    venue_id,
    start_date,
    end_date,
    price,
    total_tickets
  } = body;

  // 1. Validate required text fields
  for (const [field, value] of Object.entries({ title, category })) {
    if (typeof value !== "string" || !value.trim()) {
      return `${field} is required`;
    }
  }

  // 2. Validate venue_id (adjust to your column type)
  if (!Number.isInteger(venue_id) || venue_id <= 0) {
    return "venue_id must be a positive integer";
  }

  // 3. Validate description
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return "description must be a string";
  }

  // 4. Validate dates (check types first, then parse)
  if (
    typeof start_date !== "string" ||
    typeof end_date !== "string" ||
    !start_date.trim() ||
    !end_date.trim()
  ) {
    return "Valid start_date and end_date are required";
  }

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Valid start_date and end_date are required";
  }

  if (end <= start) {
    return "end_date must be after start_date";
  }

  // 5. Validate price
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return "price must be a non-negative number";
  }

  // 6. Validate ticket capacity
  if (!Number.isInteger(total_tickets) || total_tickets <= 0) {
    return "total_tickets must be a positive integer";
  }

  return null;
};