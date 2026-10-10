
CREATE TABLE users (
    id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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

    price NUMERIC(10, 2) NOT NULL
        CHECK (price >= 0),

    total_tickets INTEGER NOT NULL
        CHECK (total_tickets > 0),

    available_tickets INTEGER NOT NULL
        CHECK (
            available_tickets >= 0
            AND available_tickets <= total_tickets
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'published',
                'cancelled',
                'completed'
            )
        ),

    created_by uuid NOT NULL
        REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_event_dates
        CHECK (end_date > start_date)
);

-- psql -U postgres -d ticketrush -f src/db/schema.sql
