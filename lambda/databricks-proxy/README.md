# Databricks Lambda Proxy

This Lambda function solves CORS issues when connecting to Databricks from a browser-based React app.

## Quick Start

1. **Deploy the Lambda function** (see DEPLOYMENT.md for detailed instructions)
2. **Create API Gateway** to expose the Lambda
3. **Update your React app** with the API Gateway URL

## What This Does

- Acts as a proxy between your React app and Databricks
- Handles authentication with Databricks (token stays server-side)
- Adds CORS headers so browsers allow the requests
- Forwards SQL queries to Databricks and returns results

## Files

- `index.mjs` - Lambda function code (ES module for Node.js 24.x)
- `package.json` - Node.js package configuration
- `DEPLOYMENT.md` - Step-by-step deployment guide
- `README.md` - This file

## Environment Variables Required

Set these in Lambda configuration:

```
DATABRICKS_HOSTNAME=your-databricks-host.cloud.databricks.com
DATABRICKS_TOKEN=your-databricks-token
```

## API Usage

Your React app will call the Lambda via API Gateway:

```javascript
POST https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod/proxy

Body:
{
  "path": "/api/2.0/sql/statements",
  "method": "POST",
  "data": {
    "statement": "SELECT * FROM table",
    "warehouse_id": "99ea29c9d173a875",
    "wait_timeout": "30s"
  }
}
```

## Next Steps

1. Follow DEPLOYMENT.md to deploy
2. Get your API Gateway URL
3. Update REACT_APP_API_BASE_URL in your .env files
4. Test the connection!
