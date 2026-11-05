#!/bin/sh
# This repository is public: fail on host names, home paths or private service names.
if git grep -n -I -i -E '\.ts\.net|redock|/home/|/Users/|~/c/|\b(six|forty|smallie|alfa|sia|joe|tim)\b' -- ':!scripts/check-public.sh'; then
  echo 'check-public: private names above' >&2; exit 1
fi
