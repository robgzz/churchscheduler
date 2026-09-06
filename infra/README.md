# Azure Infrastructure Package — Church Scheduler V2

This folder and the sibling `scripts/` folder deploy Church Scheduler V2 to **commercial/public Azure (`AzureCloud`)**.

## Resources

- Azure Container Apps managed environment (Consumption)
- Public HTTPS Azure Container App with external ingress
- Scheduled Azure Container Apps Job
- Azure Container Registry (Basic)
- Azure StorageV2 (Standard LRS)
  - Azure Tables for application records
  - private Blob containers for attachments/imports/backups
- User-assigned Managed Identity
- RBAC: Storage Blob Data Contributor, Storage Table Data Contributor, AcrPull

The application is reachable from normal internet networks through the Container App's HTTPS FQDN. The Storage public endpoint is enabled for service connectivity, but anonymous Blob access and Shared Key authentication are disabled; application data access uses Entra ID/Managed Identity.

## Recommended first deployment (Windows)

1. Extract the **V2 app ZIP**.
2. Either keep this `infra/` and `scripts/` folder inside that app folder, or pass `-AppSourcePath` to the deployment script.
3. Install Azure CLI.
4. Run:

```powershell
az login

.\scripts\validate-infra.ps1

.\scripts\first-deploy.ps1 `
  -ResourceGroup "rg-church-scheduler-v2" `
  -Location "centralus" `
  -NamePrefix "westburyapp" `
  -ChurchId "westbury" `
  -InitialOwnerUsername "robertogonzalez" `
  -MinReplicas 0
```

If the infra package is in a separate folder, add:

```powershell
-AppSourcePath "C:\path\to\church-scheduler-v2-app"
```

The script explicitly selects the `AzureCloud` cloud, deploys Bicep, builds the image in ACR, updates the web app and scheduler job, and prints the public HTTPS URL plus a one-time bootstrap code.

## GitHub Desktop / Actions

After first deployment, publish the app folder as a GitHub repository, then run:

```powershell
.\scripts\configure-github-oidc.ps1 `
  -ResourceGroup "rg-church-scheduler-v2" `
  -GitHubOwner "YOUR_GITHUB_USER_OR_ORG" `
  -GitHubRepo "YOUR_REPOSITORY"
```

Add the printed values as GitHub Actions repository secrets. Pushes to `main` then run `.github/workflows/deploy.yml`.

## Validation

`validate-infra.ps1` uses the Azure CLI's Bicep compiler to validate/compile `main.bicep` without deploying resources.

A real Azure deployment still depends on your subscription permissions, regional Container Apps availability/quotas, and RBAC permission to create role assignments.


## V2.5 communications infrastructure

`communications.bicep` is deliberately separate from `main.bicep`. This lets you add or change ACS without reconciling the scheduler/storage/container infrastructure. Use `scripts/deploy-communications.ps1` for ACS provisioning and `scripts/enable-acs.ps1` only after email DNS verification is complete.
