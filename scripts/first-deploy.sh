#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-church-scheduler-v2-rg}"
LOCATION="${LOCATION:-centralus}"
NAME_PREFIX="${NAME_PREFIX:-churchv2}"
CHURCH_ID="${CHURCH_ID:-westbury}"
SEED_PROFILE="${SEED_PROFILE:-westbury}"
INITIAL_OWNER_USERNAME="${INITIAL_OWNER_USERNAME:-churchadmin}"
MIN_REPLICAS="${MIN_REPLICAS:-1}"
APP_SOURCE_PATH="${APP_SOURCE_PATH:-}"
BOOTSTRAP_CODE="${BOOTSTRAP_CODE:-$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(30))
PY
)}"
PICKUP_CODE_ENCRYPTION_KEY="${PICKUP_CODE_ENCRYPTION_KEY:-$(python3 - <<'PY'
import secrets, base64
print(base64.b64encode(secrets.token_bytes(32)).decode())
PY
)}"

command -v az >/dev/null || { echo "Azure CLI (az) is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
az cloud set --name AzureCloud >/dev/null
az config set extension.use_dynamic_install=yes_without_prompt >/dev/null
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true
az bicep version >/dev/null 2>&1 || az bicep install >/dev/null
az account show >/dev/null 2>&1 || az login >/dev/null
az provider register --namespace Microsoft.App --wait >/dev/null
az provider register --namespace Microsoft.ContainerRegistry --wait >/dev/null
az provider register --namespace Microsoft.Storage --wait >/dev/null
az provider register --namespace Microsoft.ManagedIdentity --wait >/dev/null
az group create -g "$RESOURCE_GROUP" -l "$LOCATION" >/dev/null

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "$APP_SOURCE_PATH" ]]; then APP_SOURCE_PATH="$ROOT"; fi
APP_SOURCE_PATH="$(cd "$APP_SOURCE_PATH" && pwd)"
[[ -f "$APP_SOURCE_PATH/Dockerfile" ]] || { echo "APP_SOURCE_PATH must point to the extracted V2 app folder containing Dockerfile." >&2; exit 1; }
DEPLOYMENT="church-v2-$(date +%Y%m%d%H%M%S)"
OUT="$(az deployment group create -g "$RESOURCE_GROUP" -n "$DEPLOYMENT" -f "$ROOT/infra/main.bicep" \
  -p namePrefix="$NAME_PREFIX" location="$LOCATION" churchId="$CHURCH_ID" seedProfile="$SEED_PROFILE" \
     initialOwnerUsername="$INITIAL_OWNER_USERNAME" minReplicas="$MIN_REPLICAS" bootstrapCode="$BOOTSTRAP_CODE" pickupCodeEncryptionKey="$PICKUP_CODE_ENCRYPTION_KEY" -o json)"

ACR="$(jq -r '.properties.outputs.containerRegistryName.value' <<<"$OUT")"
APP="$(jq -r '.properties.outputs.containerAppName.value' <<<"$OUT")"
JOB="$(jq -r '.properties.outputs.schedulerJobName.value' <<<"$OUT")"
SERVER="$(jq -r '.properties.outputs.containerRegistryLoginServer.value' <<<"$OUT")"
IMAGE="$SERVER/church-scheduler-v2:initial"

(cd "$APP_SOURCE_PATH" && az acr build --registry "$ACR" --image church-scheduler-v2:initial . >/dev/null)
az containerapp update -g "$RESOURCE_GROUP" -n "$APP" --image "$IMAGE" >/dev/null
az containerapp job update -g "$RESOURCE_GROUP" -n "$JOB" --image "$IMAGE" --command node --args src/jobs/scheduler.js >/dev/null
az containerapp ingress update -g "$RESOURCE_GROUP" -n "$APP" --target-port 8080 --transport auto >/dev/null
az containerapp job start -g "$RESOURCE_GROUP" -n "$JOB" >/dev/null
FQDN="$(az containerapp show -g "$RESOURCE_GROUP" -n "$APP" --query properties.configuration.ingress.fqdn -o tsv)"
cat <<EOF
Deployment complete.
App URL: https://$FQDN
One-time bootstrap code: $BOOTSTRAP_CODE
Initial owner username: $INITIAL_OWNER_USERNAME
EOF
