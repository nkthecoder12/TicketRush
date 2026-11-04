-- Up Migration

ALTER TABLE events
DROP COLUMN available_tickets,
DROP COLUMN total_tickets;


-- Down Migration

ALTER TABLE events
ADD COLUMN available_tickets INTEGER,
ADD COLUMN total_tickets INTEGER;