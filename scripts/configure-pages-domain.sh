#!/usr/bin/env bash
# Idempotently wire the canonical domain to a Cloudflare Pages project.
#
# Cloudflare gives newer Pages projects a suffixed default subdomain
# (e.g. webos-55p.pages.dev), so the CNAME target must be read from the
# project's `subdomain` field via the API — never guessed as
# `<name>.pages.dev`. A proxied CNAME pointing at a wrong/unbound hostname
# fails Pages verification ("CNAME record not set") and serves Error 1014.
#
# Usage: ./scripts/configure-pages-domain.sh <project_name> <domain_name>
# Env:    CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, ZONE_ID

set -euo pipefail

PROJECT_NAME="${1:?Usage: $0 <project_name> <domain_name>}"
DOMAIN_NAME="${2:?Usage: $0 <project_name> <domain_name>}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"

if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]] ||
	[[ ! "$DOMAIN_NAME" =~ ^[a-z0-9.-]+$ ]]; then
	echo "ERROR: invalid Pages project or domain name." >&2
	exit 1
fi

base="https://api.cloudflare.com/client/v4"
authorization="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
domains_api="$base/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/domains"

subdomain=$(
	curl --silent --show-error --fail-with-body \
		--header "$authorization" \
		"$base/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}" |
		python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["subdomain"])'
)
echo "Pages project $PROJECT_NAME subdomain: $subdomain"

zone_id="${ZONE_ID:-}"
if [ -z "$zone_id" ]; then
	zone_id=$(
		curl --silent --show-error \
			--header "$authorization" "$domains_api/$DOMAIN_NAME" |
			python3 -c '
import json, sys
d = json.load(sys.stdin)
if d["success"]:
    print(d["result"]["zone_tag"])
else:
    sys.exit(1)'
	) || {
		echo "ERROR: no existing Pages domain association to read the zone from." >&2
		echo "       Re-run with ZONE_ID=<zone_id> exported." >&2
		exit 1
	}
fi
echo "Zone: $zone_id"

records_api="$base/zones/$zone_id/dns_records"
existing=$(
	curl --silent --show-error \
		--header "$authorization" \
		"$records_api?type=CNAME&name=${DOMAIN_NAME}"
)
existing_id=$(echo "$existing" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(d["result"][0]["id"] if d["result"] else "")')
existing_content=$(echo "$existing" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(d["result"][0]["content"] if d["result"] else "")')

if [ -n "$existing_id" ]; then
	if [ "$existing_content" != "$subdomain" ]; then
		curl --silent --show-error --fail-with-body --output /dev/null \
			--request PATCH \
			--header "$authorization" \
			--header "Content-Type: application/json" \
			--data "{\"content\":\"${subdomain}\"}" \
			"$records_api/$existing_id"
		echo "CNAME $DOMAIN_NAME updated: $existing_content -> $subdomain"
	else
		echo "CNAME $DOMAIN_NAME already points at $subdomain."
	fi
else
	curl --silent --show-error --fail-with-body --output /dev/null \
		--request POST \
		--header "$authorization" \
		--header "Content-Type: application/json" \
		--data "{\"type\":\"CNAME\",\"name\":\"${DOMAIN_NAME}\",\"content\":\"${subdomain}\",\"proxied\":true,\"ttl\":1}" \
		"$records_api"
	echo "CNAME $DOMAIN_NAME -> $subdomain created (proxied)."
fi

domain_state=$(curl --silent --show-error --header "$authorization" "$domains_api/$DOMAIN_NAME")
status=$(echo "$domain_state" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(d["result"]["status"] if d["success"] else "missing")')

if [ "$status" = "active" ]; then
	echo "Cloudflare Pages domain $DOMAIN_NAME is active."
	exit 0
fi

if [ "$status" = "pending" ]; then
	curl --silent --show-error --fail-with-body --output /dev/null \
		--request DELETE --header "$authorization" "$domains_api/$DOMAIN_NAME"
	echo "Stale pending association removed; re-associating to trigger verification."
fi

curl --silent --show-error --fail-with-body --output /dev/null \
	--request POST \
	--header "$authorization" \
	--header "Content-Type: application/json" \
	--data "{\"name\":\"${DOMAIN_NAME}\"}" \
	"$domains_api"

for _ in $(seq 1 30); do
	sleep 10
	status=$(curl --silent --show-error --header "$authorization" "$domains_api/$DOMAIN_NAME" |
		python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["status"])')
	if [ "$status" = "active" ]; then
		echo "Cloudflare Pages domain $DOMAIN_NAME is active."
		exit 0
	fi
	echo "verifying... ($status)"
done

echo "ERROR: domain association did not reach 'active' within 300s." >&2
exit 1
