# 🌐 Domain Configuration Guide: GoDaddy → Railway

This guide walks you through configuring your GoDaddy domain to point to your Railway-deployed Bookiji webapp.

## 📋 Prerequisites

- ✅ GoDaddy domain purchased and active
- ✅ Railway project deployed and running
- ✅ Railway CLI installed and authenticated
- ✅ Access to GoDaddy account and domain management

## 🎯 Current Railway URLs

Based on your configuration, your services are deployed at:

- **Frontend**: `https://bookiji-frontend.railway.app`
- **LLM API**: `https://bookiji-llm.railway.app`
- **Database**: `bookiji-database.railway.app:5432`

## 🚀 Step-by-Step Configuration

### Step 1: Get Railway Domain Information

First, let's get the exact domain information from Railway:

```bash
# Navigate to your project directory
cd bookiji

# Check your Railway project status
railway status

# Get domain information
railway domain list
```

### Step 2: Configure GoDaddy DNS Settings

1. **Login to GoDaddy**
   - Go to [godaddy.com](https://godaddy.com)
   - Sign in to your account
   - Navigate to "My Products" → "Domains"

2. **Access DNS Management**
   - Find your domain in the list
   - Click "Manage" next to your domain
   - Go to "DNS" tab
   - Click "Manage DNS"

3. **Add CNAME Record for Subdomain (Recommended)**
   ```
   Type: CNAME
   Name: www
   Value: bookiji-frontend.railway.app
   TTL: 600 (or 1 hour)
   ```

4. **Add A Record for Root Domain (Alternative)**
   ```
   Type: A
   Name: @
   Value: [Railway IP Address] (if provided)
   TTL: 600
   ```

5. **Add Additional CNAME Records (Optional)**
   ```
   Type: CNAME
   Name: api
   Value: bookiji-llm.railway.app
   TTL: 600
   ```

### Step 3: Configure Railway Custom Domain

```bash
# Add your custom domain to Railway
railway domain add yourdomain.com

# Add subdomain (recommended)
railway domain add www.yourdomain.com

# Verify domain status
railway domain list
```

### Step 4: Update Environment Variables

Update your Railway environment variables to use your custom domain:

```bash
# Update frontend service variables
railway variables set NEXT_PUBLIC_APP_URL=https://www.yourdomain.com --service bookiji-frontend
railway variables set NEXTAUTH_URL=https://www.yourdomain.com --service bookiji-frontend

# Update any other domain-dependent variables
railway variables set NEXT_PUBLIC_API_URL=https://api.yourdomain.com --service bookiji-frontend
```

### Step 5: SSL Certificate Configuration

Railway automatically provisions SSL certificates for custom domains:

```bash
# Check SSL status
railway domain list

# Force SSL certificate renewal (if needed)
railway domain renew yourdomain.com
```

## 🔧 Advanced Configuration

### Option 1: Root Domain Configuration (Apex Domain)

If you want to use yourdomain.com (without www):

1. **In GoDaddy DNS:**
   ```
   Type: CNAME
   Name: @
   Value: bookiji-frontend.railway.app
   TTL: 600
   ```

2. **In Railway:**
   ```bash
   railway domain add yourdomain.com
   ```

### Option 2: Subdomain Configuration (Recommended)

Use www.yourdomain.com for better compatibility:

1. **In GoDaddy DNS:**
   ```
   Type: CNAME
   Name: www
   Value: bookiji-frontend.railway.app
   TTL: 600
   ```

2. **In Railway:**
   ```bash
   railway domain add www.yourdomain.com
   ```

### Option 3: Multiple Subdomains

Configure different services on different subdomains:

```
Frontend: www.yourdomain.com → bookiji-frontend.railway.app
API: api.yourdomain.com → bookiji-llm.railway.app
Admin: admin.yourdomain.com → bookiji-frontend.railway.app
```

## 🔍 Verification Steps

### 1. DNS Propagation Check
```bash
# Check if DNS is propagating
nslookup www.yourdomain.com
dig www.yourdomain.com

# Check from different locations
curl -I https://www.yourdomain.com
```

### 2. Railway Domain Status
```bash
# Check domain status in Railway
railway domain list

# View domain logs
railway logs --service bookiji-frontend
```

### 3. SSL Certificate Verification
```bash
# Check SSL certificate
openssl s_client -connect www.yourdomain.com:443 -servername www.yourdomain.com
```

## 🚨 Troubleshooting

### Common Issues

1. **DNS Not Propagating**
   - Wait 24-48 hours for full propagation
   - Check with different DNS lookup tools
   - Verify TTL settings

2. **SSL Certificate Issues**
   ```bash
   # Force SSL renewal
   railway domain renew yourdomain.com
   
   # Check certificate status
   railway domain list
   ```

3. **Domain Not Loading**
   ```bash
   # Check Railway service status
   railway status
   
   # View service logs
   railway logs --service bookiji-frontend
   ```

4. **CNAME Conflicts**
   - Remove any conflicting A records
   - Ensure only one record points to Railway
   - Check for redirects in GoDaddy

### GoDaddy-Specific Issues

1. **Domain Forwarding**
   - Disable any domain forwarding in GoDaddy
   - Use DNS management instead of forwarding

2. **Parked Page**
   - Remove any parked page settings
   - Ensure domain points to DNS management

3. **SSL Certificate in GoDaddy**
   - Don't enable SSL in GoDaddy
   - Let Railway handle SSL certificates

## 📊 Monitoring

### Set Up Monitoring
```bash
# Monitor domain health
railway logs --follow --service bookiji-frontend

# Check domain status periodically
railway domain list
```

### Performance Optimization
```bash
# Enable Railway's CDN (if available)
railway variables set ENABLE_CDN=true --service bookiji-frontend

# Configure caching headers
railway variables set CACHE_CONTROL=max-age=3600 --service bookiji-frontend
```

## 🔄 Maintenance

### Regular Checks
- Monitor SSL certificate expiration
- Check DNS propagation after changes
- Verify service uptime
- Review Railway usage and costs

### Updates
```bash
# Update domain configuration after deployments
railway variables set NEXT_PUBLIC_APP_URL=https://www.yourdomain.com --service bookiji-frontend

# Redeploy if needed
railway up
```

## 📞 Support

If you encounter issues:

1. **Railway Support**: [railway.app/support](https://railway.app/support)
2. **GoDaddy Support**: [godaddy.com/help](https://godaddy.com/help)
3. **DNS Tools**: [whatsmydns.net](https://whatsmydns.net)

## ✅ Checklist

- [ ] Railway project deployed and running
- [ ] GoDaddy DNS records configured
- [ ] Railway custom domain added
- [ ] Environment variables updated
- [ ] SSL certificate provisioned
- [ ] Domain propagation verified
- [ ] Application accessible via custom domain
- [ ] SSL certificate working
- [ ] Monitoring configured

---

**Note**: DNS changes can take 24-48 hours to fully propagate globally. Be patient and use multiple DNS lookup tools to verify propagation. 