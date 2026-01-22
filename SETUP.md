# XREF Manager - Setup Guide

## Environment Configuration

### Step 1: Configure Local Environment

1. Open `.env` file in the root directory
2. Fill in the following values:

#### AWS Cognito Values (from AWS Console)
- `REACT_APP_USER_POOL_ID` - Found in Cognito > User pools > Your pool > User pool overview
- `REACT_APP_USER_POOL_CLIENT_ID` - Found in Cognito > User pools > Your pool > App integration > App clients
- `REACT_APP_OAUTH_DOMAIN` - Found in Cognito > User pools > Your pool > App integration > Domain
  - Example: `xref-manager.auth.us-east-1.amazoncognito.com`

#### Entra ID Values (from Azure Portal)
- `REACT_APP_ENTRA_CLIENT_ID` - Found in Azure AD > App registrations > Your app > Overview > Application (client) ID
- `REACT_APP_ENTRA_AUTHORITY` - Use format: `https://login.microsoftonline.com/{tenant-id}`
  - Get tenant ID from Azure AD > App registrations > Your app > Overview > Directory (tenant) ID

### Step 2: Test Locally

```bash
npm start
```

Visit http://localhost:3000 and click "Login through SSO"

### Step 3: Configure Production (Amplify)

1. Go to AWS Amplify Console
2. Select your app
3. Go to **App settings** > **Environment variables**
4. Add all variables from `.env.production` file
5. **Important:** Update `REACT_APP_REDIRECT_URI` to your Amplify app URL
   - Example: `https://main.d1234567890abc.amplifyapp.com`

### Step 4: Update Redirect URIs

After deploying to Amplify, update redirect URIs in:

#### AWS Cognito:
1. Go to Cognito > User pools > Your pool > App integration > App clients
2. Click your app client
3. Edit **Allowed callback URLs** and **Allowed sign-out URLs**
4. Add your Amplify URL: `https://your-app.amplifyapp.com`

#### Azure AD:
1. Go to Azure AD > App registrations > Your app > Authentication
2. Add your Amplify URL to **Redirect URIs**
3. Also update the SAML callback URL in Cognito settings

## Quick Reference

### Where to Find Values

| Variable | Location |
|----------|----------|
| User Pool ID | AWS Cognito Console > User pools > Your pool |
| App Client ID | AWS Cognito Console > User pools > Your pool > App integration |
| OAuth Domain | AWS Cognito Console > User pools > Your pool > App integration > Domain |
| Entra Client ID | Azure Portal > Azure AD > App registrations > Your app > Overview |
| Tenant ID | Azure Portal > Azure AD > App registrations > Your app > Overview |

### Testing Checklist

- [ ] Local environment variables configured
- [ ] Can run `npm start` without errors
- [ ] SSO login redirects to Entra ID
- [ ] After Entra ID login, redirects back to app
- [ ] User is authenticated and can see main app
- [ ] Production environment variables added to Amplify
- [ ] Redirect URIs updated in Cognito
- [ ] Redirect URIs updated in Azure AD
- [ ] Production SSO flow works

## Troubleshooting

### "Invalid redirect URI" error
- Check that redirect URIs match exactly in Cognito, Azure AD, and your `.env` file
- No trailing slashes!

### "Provider not found" error
- Verify the SAML provider name in Cognito is exactly `EntraID` (case-sensitive)

### SSO redirects but doesn't log in
- Check SAML attribute mappings in Cognito
- Verify Federation metadata URL is correct in Cognito

### Need Help?
Check the AWS Cognito CloudWatch logs for detailed error messages.
