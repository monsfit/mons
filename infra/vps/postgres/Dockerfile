FROM postgres:18.4-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      pgbackrest=2.59.0-1.pgdg12+1 \
    && pgbackrest version \
    && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint-regolith.sh /usr/local/bin/docker-entrypoint-regolith
COPY init-regolith.sh /docker-entrypoint-initdb.d/10-regolith.sh

RUN chmod 0755 \
    /usr/local/bin/docker-entrypoint-regolith \
    /docker-entrypoint-initdb.d/10-regolith.sh

ENTRYPOINT ["docker-entrypoint-regolith"]
CMD ["postgres"]

