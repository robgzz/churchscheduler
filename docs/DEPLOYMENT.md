# Azure + GitHub deployment runbook

## Production architecture choices

- Azure public/commercial cloud
- Public external HTTPS ingress on Azure Container Apps
- No VNet/private endpoint requirement for V2
- Azure Storage public service endpoint enabled, but anonymous Blob and Shared Key access disabled
- Managed Identity/RBAC for application data access
- Basic ACR
- Container Apps Consumption environment
- `minReplicas=0` by default for lowest cost; choose `1` if cold-start latency is undesirable
- Scheduled Container Apps Job runs every 15 minutes by default; scheduler logic itself uses the church timezone when deciding the current three-week window

Container Apps scheduled-job cron expressions are UTC. Because this job simply reconciles state every few minutes rather than representing a worship service time, DST does not require separate CST/CDT jobs.

## First deployment

Use `scripts/first-deploy.ps1` on Windows or `scripts/first-deploy.sh` on bash environments.

The Bicep template is idempotent for infrastructure. The secure bootstrap code is passed as an Azure Container Apps secret and should never be checked into source control.

## GitHub deployment

`configure-github-oidc.ps1` creates an Entra application/service principal and federated credential for the repository's `main` branch. The GitHub workflow:

1. runs tests/syntax checks
2. authenticates to Azure with OIDC
3. builds the Docker image
4. pushes it to ACR
5. updates the Container App image
6. updates the scheduled Job image
7. calls `/healthz`

This is compatible with GitHub Desktop: pushing `main` is what triggers the workflow.

## Rollback

Each GitHub deployment uses the Git commit SHA as the image tag. To roll back, update the app and job to a prior image tag:

```powershell
az containerapp update -g <rg> -n <app> --image <acr>.azurecr.io/church-scheduler-v2:<old-sha>
az containerapp job update -g <rg> -n <job> --image <acr>.azurecr.io/church-scheduler-v2:<old-sha>
```

## Custom domain later

The default `*.azurecontainerapps.io` HTTPS URL is sufficient for V2. A custom church domain can be added later without changing the application data model.

## ACS SMS/email later

Azure Communication Services is intentionally not provisioned in this package. Notification channel preferences and provider integration can be layered onto the API after toll-free/SMS compliance decisions are made.
