#!/bin/bash

# Start PostgreSQL command line interface
echo "Starting PostgreSQL command line interface..."
sudo -u postgres psql -d postgres <<EOF

CREATE DATABASE specra;
CREATE USER specra WITH ENCRYPTED PASSWORD 'specra' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE specra TO specra;

-- Connect to the specra database to grant schema permissions
\c specra

-- Grant schema-level permissions
GRANT ALL ON SCHEMA public TO specra;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO specra;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO specra;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO specra;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO specra;

-- Optional: superuser privileges if needed
-- ALTER USER specra WITH SUPERUSER;
EOF

# Exit PostgreSQL command line interface
echo "Exiting PostgreSQL command line interface..."
