const checkBtn = document.getElementById('checkBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const error = document.getElementById('error');

checkBtn.addEventListener('click', async () => {
    results.classList.add('hidden');
    error.classList.add('hidden');
    loading.classList.remove('hidden');
    checkBtn.disabled = true;
    
    try {
        const response = await fetch('/api/check-ip');
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        document.getElementById('ipAddress').textContent = data.ip || '-';
        document.getElementById('location').textContent = 
            `${data.city || ''}, ${data.region || ''}, ${data.country || ''}`.replace(/^,\s*|,\s*$/g, '') || '-';
        document.getElementById('isp').textContent = data.isp || '-';
        document.getElementById('org').textContent = data.org || '-';
        
        const vpnStatus = document.getElementById('vpnStatus');
        if (data.isVPN || data.isHosting) {
            vpnStatus.textContent = '⚠️ VPN or Proxy Detected';
            vpnStatus.className = 'status-badge vpn-detected';
        } else {
            vpnStatus.textContent = '✅ No VPN Detected';
            vpnStatus.className = 'status-badge no-vpn';
        }
        
        const compromiseSection = document.getElementById('compromiseSection');
        const safeSection = document.getElementById('safeSection');
        
        if (data.compromiseData) {
            compromiseSection.classList.remove('hidden');
            safeSection.classList.add('hidden');
            
            document.getElementById('riskDays').textContent = data.compromiseData.days;
            document.getElementById('riskLevel').textContent = data.compromiseData.riskLevel;
            document.getElementById('riskScore').textContent = `${data.compromiseData.riskScore}/100`;
            
            const riskLevelElement = document.getElementById('riskLevel');
            riskLevelElement.className = 'risk-value ' + data.compromiseData.riskLevel.toLowerCase();
        } else {
            compromiseSection.classList.add('hidden');
            safeSection.classList.remove('hidden');
        }
        
        results.classList.remove('hidden');
        
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
        checkBtn.disabled = false;
    }
});

