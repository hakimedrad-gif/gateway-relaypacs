# PACS Integration Setting Guide

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Enable PACS connectivity and configuration
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Integration Overview

### Supported PACS Systems
- **Orthanc PACS** (v1.11+)
- **dcm4chee-arc** (v5.34+)
- Any DICOMweb-compliant PACS

### Integration Standards
- **STOW-RS** (Store Over the Web): Upload studies to PACS
- **WADO-RS** (Web Access to DICOM Objects): Retrieve studies from PACS
- **QIDO-RS** (Query based on ID for DICOM Objects): Search studies

---

## Prerequisites

### Network Requirements
- **Connectivity**: RelayPACS backend must reach PACS server (HTTP/HTTPS)
- **Ports**:
  - Orthanc: 8042 (default)
  - dcm4chee: 8080 (default)
- **Firewall**: Allow outbound traffic on PACS ports

### PACS Requirements
- DICOMweb plugin enabled
- API credentials (username/password or OAuth2)
- AE Title configured (for DICOM C-STORE fallback)

---

## Configuration Steps

### Step 1: Configure Orthanc PACS

**1.1 Enable DICOMweb Plugin**

Edit `orthanc.json`:
```json
{
  "Plugins": [
    "/usr/share/orthanc/plugins"
  ],
  "DicomWeb": {
    "Enable": true,
    "Root": "/dicom-web/",
    "EnableWado": true,
    "WadoRoot": "/wado",
    "Ssl": false
  },
  "AuthenticationEnabled": true,
  "RegisteredUsers": {
    "relaypacs": "SecurePassword123!"
  }
}
```

**1.2 Restart Orthanc**:
```bash
docker restart orthanc
```

**1.3 Verify DICOMweb**:
```bash
curl -u relaypacs:SecurePassword123! \
  http://localhost:8042/dicom-web/studies
```

### Step 2: Configure dcm4chee-arc

**2.1 Access Admin UI**:
- URL: `http://localhost:8080/dcm4chee-arc/ui2`
- Login with default credentials (change in production)

**2.2 Configure AE Title**:
- Navigate to Device → AE Title
- Add AE Title: `RELAYPACS_GW`
- Accepted Calling AE Title: `*` (or specific)

**2.3 Enable STOW-RS**:
- Navigate to Configuration → DICOMweb
- Ensure STOW-RS service enabled on `/dcm4chee-arc/aets/{aet}/rs`

### Step 3: Configure RelayPACS Environment

**Environment Variables** (`.env` file):
```bash
# PACS Configuration
PACS_ENABLED=true
ACTIVE_PACS=orthanc,dcm4chee  # or just one

# Orthanc settings
ORTHANC_URL=http://orthanc:8042
ORTHANC_USERNAME=relaypacs
ORTHANC_PASSWORD=SecurePassword123!
ORTHANC_AE_TITLE=ORTHANC

# dcm4chee settings
DCM4CHEE_URL=http://dcm4chee:8080
DCM4CHEE_USERNAME=admin
DCM4CHEE_PASSWORD=admin
DCM4CHEE_AE_TITLE=DCM4CHEE

# Retry settings
PACS_RETRY_ATTEMPTS=3
PACS_RETRY_DELAY=2  # seconds
```

---

## Testing PACS Integration

### Test 1: Manual STOW-RS Upload

```bash
# Create test DICOM file
dcmtk-utils generate-dicom test.dcm

# Upload to Orthanc
curl -X POST \
  -u relaypacs:SecurePassword123! \
  -H "Content-Type: application/dicom" \
  --data-binary @test.dcm \
  http://localhost:8042/dicom-web/studies
```

**Expected Response**: `200 OK` with study UID

### Test 2: RelayPACS Upload Verification

1. Upload via RelayPACS UI
2. Check backend logs for PACS forwarding:
```bash
docker logs backend | grep "PACS forward"
```
3. Verify study in PACS:
```bash
# Orthanc
curl -u relaypacs:SecurePassword123! \
  http://localhost:8042/studies

# dcm4chee
curl http://localhost:8080/dcm4chee-arc/aets/DCM4CHEE/rs/studies
```

---

## Troubleshooting

### Issue: "PACS unreachable"
**Symptoms**: Uploads stuck, logs show connection errors

**Solutions**:
1. Verify PACS server running:
```bash
docker ps | grep orthanc
```
2. Test network connectivity:
```bash
curl http://orthanc:8042/system
```
3. Check firewall rules
4. Verify environment variables set correctly

### Issue: "Authentication failed"
**Symptoms**: HTTP 401 Unauthorized

**Solutions**:
1. Verify credentials in `.env`
2. Test credentials manually:
```bash
curl -u $ORTHANC_USERNAME:$ORTHANC_PASSWORD \
  http://$ORTHANC_URL/system
```
3. Reset PACS password if needed

### Issue: "Invalid DICOM file"
**Symptoms**: PACS rejects upload, HTTP 400

**Solutions**:
1. Validate DICOM file locally:
```bash
dcmdump test.dcm
```
2. Check required DICOM tags present
3. Use pydicom validation in backend

---

## Security Considerations

### Production Checklist
- [ ] Use HTTPS for PACS connections (not HTTP)
- [ ] Rotate credentials quarterly
- [ ] Use strong passwords (20+ chars)
- [ ] Enable IP allowlisting on PACS
- [ ] Audit PACS access logs weekly

---

**Document Status**: ✅ COMPLETE
