#!/bin/sh
# Daily database backup to Object Storage, in a separate account/bucket.
#
# Why this exists even though the DBaaS has automatic snapshots: provider
# snapshots live with the same provider and cover 30 days. Brazilian Law
# 13.787/2018 requires health records to be kept for 20 years, and a backup
# in the same place as the data is not a backup: if the account is compromised
# or closed, both disappear together.
#
# Runs in its own loop, without the host cron: it sleeps until the scheduled
# time, runs and repeats. Restarting the container keeps the schedule.

set -eu

HORA_BACKUP="${HORA_BACKUP:-03}"   # local (UTC) hour of the daily backup
RETENCAO_DIAS="${RETENCAO_DIAS:-90}"

log() { echo "[backup] $(date -u '+%Y-%m-%d %H:%M:%SZ') $*"; }

instalar_dependencias() {
	if ! command -v aws >/dev/null 2>&1; then
		log "installing S3 client..."
		apk add --no-cache aws-cli >/dev/null 2>&1
	fi
}

fazer_backup() {
	CARIMBO=$(date -u '+%Y%m%d-%H%M%S')
	ARQUIVO="/tmp/gastroguide-${CARIMBO}.sql.gz"

	log "starting dump of ${DB_NAME}@${DB_HOST}"
	# --no-owner/--no-acl keep the dump restorable at another provider, which is
	# half the reason for having our own backup.
	pg_dump \
		--host="$DB_HOST" --port="$DB_PORT" \
		--username="$DB_USER" --dbname="$DB_NAME" \
		--no-owner --no-acl --clean --if-exists \
		| gzip -9 > "$ARQUIVO"

	TAMANHO=$(du -h "$ARQUIVO" | cut -f1)
	log "dump created: ${TAMANHO}"

	# An empty or truncated dump is worse than none, because it goes unnoticed.
	if [ ! -s "$ARQUIVO" ]; then
		log "ERROR: empty dump, aborting upload"
		rm -f "$ARQUIVO"
		return 1
	fi

	log "uploading to s3://${S3_BUCKET}/"
	AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
	AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
	aws --endpoint-url "$S3_ENDPOINT" s3 cp \
		"$ARQUIVO" "s3://${S3_BUCKET}/diario/gastroguide-${CARIMBO}.sql.gz"

	rm -f "$ARQUIVO"
	log "backup finished"
}

limpar_antigos() {
	LIMITE=$(date -u -d "-${RETENCAO_DIAS} days" '+%Y%m%d' 2>/dev/null || echo "")
	[ -z "$LIMITE" ] && return 0

	AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
	AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
	aws --endpoint-url "$S3_ENDPOINT" s3 ls "s3://${S3_BUCKET}/diario/" | while read -r _ _ _ NOME; do
		DATA=$(echo "$NOME" | sed -n 's/gastroguide-\([0-9]\{8\}\)-.*/\1/p')
		[ -z "$DATA" ] && continue
		if [ "$DATA" -lt "$LIMITE" ]; then
			log "removing old backup: $NOME"
			AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
			AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
			aws --endpoint-url "$S3_ENDPOINT" s3 rm "s3://${S3_BUCKET}/diario/${NOME}"
		fi
	done
}

instalar_dependencias

# One backup at startup, so a first install does not wait until tomorrow.
fazer_backup || log "ERROR in initial backup"

while true; do
	AGORA=$(date -u '+%H')
	if [ "$AGORA" = "$HORA_BACKUP" ]; then
		fazer_backup || log "ERROR in daily backup"
		limpar_antigos || log "ERROR cleaning old backups"
		sleep 3600
	fi
	sleep 300
done
