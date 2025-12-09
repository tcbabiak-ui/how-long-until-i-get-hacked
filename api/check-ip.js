const axios = require('axios');

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.headers['x-vercel-forwarded-for']?.split(',')[0] ||
         'unknown';
}

async function checkVPNStatus(ip) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,isp,org,query,proxy,hosting`);
    
    if (response.data.status === 'fail') {
      return { error: response.data.message };
    }

    return {
      ip: response.data.query,
      country: response.data.country,
      countryCode: response.data.countryCode,
      region: response.data.regionName,
      city: response.data.city,
      isp: response.data.isp,
      org: response.data.org,
      isVPN: response.data.proxy === true,
      isHosting: response.data.hosting === true
    };
  } catch (error) {
    console.error('Error checking VPN status:', error);
    return { error: 'Failed to check VPN status' };
  }
}

function calculateDaysUntilCompromised(vpnData) {
  if (!vpnData.isVPN && !vpnData.isHosting) {
    return null;
  }

  let riskScore = 0;
  
  if (vpnData.isVPN) {
    riskScore += 50;
  }
  
  if (vpnData.isHosting) {
    riskScore += 30;
  }

  const highRiskCountries = ['CN', 'RU', 'IR', 'KP', 'BY'];
  if (highRiskCountries.includes(vpnData.countryCode)) {
    riskScore += 20;
  }

  if (vpnData.isp && (
    vpnData.isp.toLowerCase().includes('hosting') ||
    vpnData.isp.toLowerCase().includes('datacenter') ||
    vpnData.isp.toLowerCase().includes('server')
  )) {
    riskScore += 15;
  }

  const days = Math.max(1, Math.ceil(90 - (riskScore * 0.89)));
  
  return {
    days,
    riskScore: Math.min(100, riskScore),
    riskLevel: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW'
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    let clientIP = getClientIP(req);
    
    if (clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.') || clientIP.startsWith('172.') || clientIP === 'unknown') {
      try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json');
        clientIP = ipResponse.data.ip;
      } catch (error) {
        return res.status(500).json({ error: 'Could not determine public IP address' });
      }
    }

    const vpnData = await checkVPNStatus(clientIP);
    
    if (vpnData.error) {
      return res.status(500).json(vpnData);
    }

    const compromiseData = calculateDaysUntilCompromised(vpnData);
    
    res.json({
      ...vpnData,
      compromiseData
    });
  } catch (error) {
    console.error('Error in /api/check-ip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

