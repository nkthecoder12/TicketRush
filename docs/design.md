# TicketRush design

## Seat states (event_seats.status)
AVAILABLE -> HELD -> BOOKED
HELD -> AVAILABLE   (hold expires or is released)

## Hold states (seat_holds.status)
ACTIVE -> COMPLETED   (payment succeeded, seat booked)
ACTIVE -> EXPIRED     (time ran out, seat released)
One row per seat. Rows from one request share a hold_group_id.
Only one ACTIVE hold per seat (unique_active_seat_hold index).

## Booking states (bookings.status)
PENDING -> CONFIRMED
PENDING -> CANCELLED / FAILED / EXPIRED

## Payment status (bookings.payment_status)
NOT_PAID -> PENDING -> PAID
PAID -> REFUND_PENDING -> REFUNDED / REFUND_FAILED

## Rules
- A seat is claimed with: UPDATE event_seats SET status='HELD'
  WHERE id = ANY($1) AND status='AVAILABLE'. If the number of rows
  updated is not the number requested, roll back everything.
- Seats are locked in sorted id order to avoid deadlocks.
- event_seats.status and seat_holds are updated in the same transaction.
- One booking per hold_group_id.
- Money is numeric; parse it deliberately in Node.