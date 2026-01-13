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
  console.log('Event:', JSON.stringify(event, null, 2));
  
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
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: path'
        })
      };
    }
    
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
    
    // Return response
    return {
      statusCode: response.statusCode,
      headers: corsHeaders,
      body: JSON.stringify(response.body)
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Internal server error'
      })
    };
  }
};
