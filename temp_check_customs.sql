#!/bin/bash
psql -U logix_user -d logix_db -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'dict_customs_brokers'"
