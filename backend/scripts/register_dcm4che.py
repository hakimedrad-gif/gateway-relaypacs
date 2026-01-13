import time
import requests
import sys

DCM4CHE_URL = "http://localhost:8081/dcm4chee-arc"
CONFIG_URL = f"{DCM4CHE_URL}/ctrl/config/devices"

def wait_for_dcm4che():
    print("Waiting for dcm4che to be ready...")
    for i in range(30):
        try:
            resp = requests.get(f"{DCM4CHE_URL}/aets", timeout=2)
            if resp.status_code == 200:
                print("dcm4che is ready!")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(2)
        print(".", end="", flush=True)
    print("\nTimeout waiting for dcm4che.")
    return False

def get_main_device_name():
    try:
        resp = requests.get(CONFIG_URL)
        resp.raise_for_status()
        devices = resp.json()
        # Usually the main archive device has 'dcmArchiveDevice' object
        for dev in devices:
            if "dcmArchiveDevice" in dev:
                print(f"Found Archive Device: {dev['dicomDeviceName']}")
                return dev['dicomDeviceName']
        # Fallback to first one if not found or explicit 'dcm4chee-arc'
        return "dcm4chee-arc"
    except Exception as e:
        print(f"Failed to list devices: {e}")
        return None

def register_webapp(device_name):
    print(f"Registering RELAYPACS WebApp on device {device_name}...")
    
    # 1. Fetch current device config
    device_url = f"{CONFIG_URL}/{device_name}"
    resp = requests.get(device_url)
    if resp.status_code != 200:
        print("Failed to fetch device config")
        return

    device_data = resp.json()
    
    # 2. Check if already exists
    webapps = device_data.get("dcmWebApp", [])
    for app in webapps:
        if app.get("dcmWebAppName") == "RELAYPACS":
            print("RELAYPACS WebApp already exists.")
            return

    # 3. Add new WebApp
    new_webapp = {
        "dcmWebAppName": "RELAYPACS",
        "dcmDescription": "RelayPACS PWA Client Node",
        "dcmWebServicePath": "/relaypacs",
        "dcmWebServiceClass": ["WADO_RS", "QIDO_RS", "STOW_RS"], # Classes this app creates/consumes
        "dicomAETitle": "RELAYPACS",
        "dcmKeycloakClientID": "relaypacs" # Optional, if using keycloak
    }
    
    # Append to local list and update via PUT (or specific sub-resource POST if supported)
    # dcm4che config API usually allows PUTting the whole device or distinct sub-tree.
    # We'll try appending to the list and PUTting the device (safer to use sub-resource if possible, but PUT device is standard)
    
    # Actually, verify if we can POST to valid collection... 
    # But standard way is often just modifying the device.
    
    webapps.append(new_webapp)
    device_data["dcmWebApp"] = webapps
    
    put_resp = requests.put(device_url, json=device_data)
    if put_resp.status_code == 204: # No Content = Success usually
        print("Successfully registered RELAYPACS WebApp.")
    elif put_resp.status_code == 200:
        print("Successfully updated RELAYPACS WebApp.")
    else:
        print(f"Failed to register WebApp. Status: {put_resp.status_code}")
        print(put_resp.text)

def main():
    if not wait_for_dcm4che():
        sys.exit(1)
        
    device_name = get_main_device_name()
    if not device_name:
        sys.exit(1)
        
    register_webapp(device_name)

if __name__ == "__main__":
    main()
