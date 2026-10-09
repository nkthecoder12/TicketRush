INSERT INTO users (name, email, password_hash)
VALUES (
    'nk',
    'nk@gmail.com',
    '$2b$12$XzxFY0fE1cI1gw8V6qzsYutNEDU/zK3McU.UoAPluaTb6w2NjV55G'
);
-- psql -U postgres -d ticketrush -f src/db/schema.sql
