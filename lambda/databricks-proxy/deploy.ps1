# Deploy Lambda function
# Run this from the lambda/databricks-proxy directory

Write-Host "Creating deployment package..." -ForegroundColor Green
Compress-Archive -Path index.mjs,package.json -DestinationPath function.zip -Force

Write-Host "Updating Lambda function..." -ForegroundColor Green
aws lambda update-function-code `
  --function-name databricks-proxy `
  --zip-file fileb://function.zip

Write-Host "Updating Lambda timeout to 60 seconds..." -ForegroundColor Green
aws lambda update-function-configuration `
  --function-name databricks-proxy `
  --timeout 60

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Lambda function updated with new code and 60-second timeout" -ForegroundColor Cyan
