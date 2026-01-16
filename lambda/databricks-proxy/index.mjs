/**
 * AWS Lambda function to proxy requests to Databricks SQL API
 * This solves CORS issues when calling Databricks from a browser
 * Node.js 24.x ES Module version
 */

import https from 'https';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Update this to your domain in production
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

/**
 * Make HTTPS request to Databricks
 */
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout to 50 seconds (Lambda max is 60s)
    req.setTimeout(50000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Lambda handler
 */
export const handler = async (event) => {
  console.log('Event method:', event.httpMethod);
  console.log('Event path:', event.path);
  console.log('Event body:', event.body ? event.body.substring(0, 200) : 'empty');
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  try {
    // Get Databricks configuration from environment variables
    const DATABRICKS_HOST = process.env.DATABRICKS_HOSTNAME;
    const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
    
    if (!DATABRICKS_HOST || !DATABRICKS_TOKEN) {
      console.error('Missing Databricks configuration');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Databricks configuration missing'
        })
      };
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { path, method = 'POST', data } = body;
    
    if (!path) {
      console.error('Missing path in request body');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: path'
        })
      };
    }
    
    console.log(`Proxying ${method} request to: ${path}`);
    
    // Prepare request to Databricks
    const options = {
      hostname: DATABRICKS_HOST,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    // Make request to Databricks
    const postData = data ? JSON.stringify(data) : null;
    const response = await makeRequest(options, postData);
    
    console.log(`Databricks response status: ${response.statusCode}`);
    
    // Return response
    return {
      statusCode: response.statusCode,
      headers: corsHeaders,
      body: JSON.stringify(response.body)
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack
      })
    };
  }
};
