# Databricks Lambda Proxy Deployment Guide

This Lambda function acts as a proxy between your React app and Databricks SQL API to solve CORS issues.

## Prerequisites
- AWS CLI installed and configured
- AWS account with permissions to create Lambda functions and API Gateway

## Step 1: Create the Lambda Function

### Option A: Using AWS Console

1. **Go to AWS Lambda Console**
   - Navigate to https://console.aws.amazon.com/lambda/

2. **Create Function**
   - Click "Create function"
   - Choose "Author from scratch"
   - Function name: `databricks-proxy`
   - Runtime: `Node.js 24.x`
   - Architecture: `x86_64`
   - Click "Create function"

3. **Upload Code**
   - In the "Code" tab, copy the contents of `index.mjs`
   - Paste it into the inline code editor
   - Click "Deploy"

4. **Set Environment Variables**
   - Go to "Configuration" → "Environment variables"
   - Click "Edit" → "Add environment variable"
   - Add these variables:
     ```
     DATABRICKS_HOSTNAME=your-databricks-host.cloud.databricks.com
     DATABRICKS_TOKEN=your-databricks-token
     ```
   - Click "Save"

5. **Configure Timeout**
   - Go to "Configuration" → "General configuration"
   - Click "Edit"
   - Set Timeout to `30 seconds` (Databricks queries can take time)
   - Click "Save"

### Option B: Using AWS CLI

1. **Create deployment package**
   ```bash
   cd lambda/databricks-proxy
   zip function.zip index.mjs package.json
   ```

2. **Create IAM role** (if you don't have one)
   ```bash
   aws iam create-role \
     --role-name lambda-databricks-proxy-role \
     --assume-role-policy-document '{
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Principal": {"Service": "lambda.amazonaws.com"},
         "Action": "sts:AssumeRole"
       }]
     }'
   
   aws iam attach-role-policy \
     --role-name lambda-databricks-proxy-role \
     --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
   ```

3. **Create Lambda function**
   ```bash
   aws lambda create-function \
     --function-name databricks-proxy \
     --runtime nodejs24.x \
     --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-databricks-proxy-role \
     --handler index.handler \
     --zip-file fileb://function.zip \
     --timeout 30 \
     --environment Variables="{DATABRICKS_HOSTNAME=YOUR_DATABRICKS_HOST,DATABRICKS_TOKEN=YOUR_DATABRICKS_TOKEN}"
   ```

## Step 2: Create API Gateway

1. **Go to API Gateway Console**
   - Navigate to https://console.aws.amazon.com/apigateway/

2. **Create REST API**
   - Click "Create API"
   - Choose "REST API" (not private)
   - Click "Build"
   - API name: `databricks-proxy-api`
   - Click "Create API"

3. **Create Resource**
   - Click "Actions" → "Create Resource"
   - Resource Name: `proxy`
   - Resource Path: `/proxy`
   - Enable "Configure as proxy resource"
   - Click "Create Resource"

4. **Create Method**
   - Select the `/proxy` resource
   - Click "Actions" → "Create Method"
   - Choose "ANY"
   - Integration type: "Lambda Function"
   - Use Lambda Proxy integration: ✓ (checked)
   - Lambda Function: `databricks-proxy`
   - Click "Save"
   - Click "OK" to give API Gateway permission

5. **Enable CORS**
   - Select the `/proxy` resource
   - Click "Actions" → "Enable CORS"
   - Leave defaults
   - Click "Enable CORS and replace existing CORS headers"
   - Click "Yes, replace existing values"

6. **Deploy API**
   - Click "Actions" → "Deploy API"
   - Deployment stage: `[New Stage]`
   - Stage name: `prod`
   - Click "Deploy"
   - **Copy the Invoke URL** (e.g., `https://abc123.execute-api.us-west-2.amazonaws.com/prod`)

## Step 3: Update React App

1. **Update .env file**
   ```
   REACT_APP_API_BASE_URL=https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod
   ```

2. **Update .env.production file** (for Amplify deployment)
   ```
   REACT_APP_API_BASE_URL=https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod
   ```

3. **Add to Amplify Environment Variables**
   - Go to Amplify Console → Your App → Environment variables
   - Add: `REACT_APP_API_BASE_URL` = `https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod`

## Step 4: Test the Lambda Function

You can test directly in the Lambda console:

**Test Event:**
```json
{
  "httpMethod": "POST",
  "body": "{\"path\":\"/api/2.0/sql/statements\",\"method\":\"POST\",\"data\":{\"statement\":\"SELECT 1 as test\",\"warehouse_id\":\"99ea29c9d173a875\",\"wait_timeout\":\"30s\"}}"
}
```

Expected response should show Databricks query results.

## Security Notes

⚠️ **Important for Production:**

1. **Update CORS Origin**
   - In `index.mjs`, change `'Access-Control-Allow-Origin': '*'` to your actual domain
   - Example: `'Access-Control-Allow-Origin': 'https://your-app.amplifyapp.com'`

2. **Secure Environment Variables**
   - Consider using AWS Secrets Manager for the Databricks token
   - Never commit tokens to Git

3. **Add Authentication**
   - Add API Gateway authorization
   - Validate requests from your Cognito user pool

4. **Rate Limiting**
   - Configure API Gateway throttling
   - Add usage plans and API keys

## Troubleshooting

**Lambda timeout errors:**
- Increase timeout in Lambda configuration (max 15 minutes)

**CORS errors:**
- Verify CORS is enabled in API Gateway
- Check the Lambda response includes CORS headers

**Databricks connection errors:**
- Verify environment variables are set correctly
- Check Databricks token is valid
- Ensure warehouse ID is correct

## Cost Estimate

- Lambda: ~$0.20 per 1 million requests
- API Gateway: ~$3.50 per 1 million requests
- Very low cost for typical usage
