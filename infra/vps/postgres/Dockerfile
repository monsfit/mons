FROM postgres:18.4-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      pgbackrest=2.59.1-1.pgdg12+1 \
    && pgbackrest version \
    && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint-mons.sh /usr/local/bin/docker-entrypoint-mons
COPY init-mons.sh /docker-entrypoint-initdb.d/10-mons.sh

RUN chmod 0755 \
    /usr/local/bin/docker-entrypoint-mons \
    /docker-entrypoint-initdb.d/10-mons.sh

ENTRYPOINT ["docker-entrypoint-mons"]
CMD ["postgres"]
