
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    venue VARCHAR(150) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
    available_tickets INTEGER NOT NULL
        CHECK (
            available_tickets >= 0
            AND available_tickets <= total_tickets
        ),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'published', 'cancelled', 'completed'
        )),
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_dates CHECK (end_date > start_date)
);
CREATE TABLE bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id UUID NOT NULL REFERENCES users(id),
    event_id BIGINT NOT NULL REFERENCES events(id),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING', 'CONFIRMED', 'CANCELLED',
            'FAILED', 'EXPIRED'
        )),

    payment_status VARCHAR(20) NOT NULL DEFAULT 'NOT_PAID'
        CHECK (payment_status IN (
            'PENDING', 'NOT_PAID', 'PAID',
            'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'
        ))
);


CREATE TABLE venues (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    address TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0)
);

ALTER TABLE events
drop COLUMN venue;


 --psql -U postgres -d ticketrush -f src/db/schema.sql
