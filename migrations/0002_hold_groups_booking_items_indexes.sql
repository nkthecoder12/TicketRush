-- 0002: group multi-seat holds, link bookings to seats/holds, add missing indexes.

-- 1) hold_group_id ties together the per-seat rows that belong to one hold request.
ALTER TABLE seat_holds ADD COLUMN hold_group_id uuid;
UPDATE seat_holds SET hold_group_id = gen_random_uuid() WHERE hold_group_id IS NULL;
ALTER TABLE seat_holds ALTER COLUMN hold_group_id SET NOT NULL;

-- 2) Bookings had no link to seats or holds.
ALTER TABLE bookings ADD COLUMN hold_group_id uuid UNIQUE;

CREATE TABLE booking_items (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id    bigint NOT NULL REFERENCES bookings(id),
  event_seat_id bigint NOT NULL REFERENCES event_seats(id),
  price         numeric NOT NULL CHECK (price >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, event_seat_id)
);
CREATE INDEX idx_booking_items_event_seat ON booking_items (event_seat_id);

-- 3) Indexes for the hot paths.
CREATE INDEX idx_seat_holds_active_expiry ON seat_holds (expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_seat_holds_group          ON seat_holds (hold_group_id);
CREATE INDEX idx_seat_holds_user_active    ON seat_holds (user_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_event_seats_event_status  ON event_seats (event_id, status);
CREATE INDEX idx_bookings_user             ON bookings (user_id);
CREATE INDEX idx_bookings_event            ON bookings (event_id);
CREATE INDEX idx_events_venue              ON events (venue_id);
CREATE INDEX idx_events_status_start       ON events (status, start_date, id);

-- 4) Role guard.
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ORGANIZER', 'ADMIN'));