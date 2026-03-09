
# The project is linked to devops repo: rhossain/ApiMonitoringDashboard_Backend
from flask import Flask, jsonify, request
import requests
import time
from flask_cors import CORS
from requests.auth import HTTPBasicAuth

app = Flask(__name__)
CORS(app)

# List of APIs to check
#APIS = [
#    {"name": "My Spring Boot API", "url": "http://localhost:8080/wikipedia"},
#   {"name": "Wikipedia API", "url": "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=API&format=json"},
#    {"name": "Azure Maps API", "url": "https://atlas.microsoft.com/search/address/json?subscription-key=YOUR_KEY&api-version=1.0&query=Seattle"}
#]

# Global cache to avoid requesting token too often
oauth_token_cache = {
    "token": None,
    "expires_at": 0
}

subscription_key="1jFjufdjfnri8fRQfTBiV2eFtatqhd2PQcrRWH8CHeIXAKPdZpdfJQQJ99AJAC5RqLJ4F8K1AAAgAZMP2QDz"

APIS = [
    {"name": "BagAddress", "url": "http://localhost:8080/BAGAdress", "method": "POST",
     "body":
     {
      "postCode": "3816GA",
      "huisNummer": 7,
      "exactMatch": False
     }
    },
    {
     "name": "Wikipedia summery",
     "url": "http://localhost:8080/wikipedia",
     "method": "POST",
     "body": 
     {
      "searchTerm": "Dhaka"
     }
    },
    {"name": "Azure Maps API", "url": f"https://atlas.microsoft.com/search/address/json?subscription-key={subscription_key}&api-version=1.0&query=Seattle", "method": "GET"}
]

def get_oauth_token():
    # Replace with your actual token endpoint and credentials
    token_url = "https://ibapp.eu.auth0.com/oauth/token"
    client_id = "pHiWz215TAgrvGWLbaqjX6JEsXqaWgXa"
    client_secret = "e-f6v-1vmpWnoLq5eHO7N-RM4k4NiSNZ-l8Rk9Vy1jbmEz7l6Jy5p_Sem9Iqz0Cx"
    audience = "https://spring-boot-api"

    # Return cached token if still valid
    if oauth_token_cache["token"] and time.time() < oauth_token_cache["expires_at"]:
        return oauth_token_cache["token"]

    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "audience": audience
    }

    response = requests.post(token_url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch token: {response.text}")

    token_data = response.json()
    access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 3600)  # default to 1h

    # Cache the token with expiration
    oauth_token_cache["token"] = access_token
    oauth_token_cache["expires_at"] = time.time() + expires_in - 60  # buffer

    return access_token

def check_api(api):
    result = {
        "name": api["name"],
        "url": api["url"],
        "status": "Healthy",
        "response_time": None,
        "error": None
    }
    try:
        start = time.time()
        response = requests.get(api["url"], timeout=3)
        end = time.time()
        result["response_time"] = int((end - start) * 1000)
        if not response.ok:
            result["status"] = "Down"
            result["error"] = f"Status code {response.status_code}"
    except Exception as e:
        result["status"] = "Down"
        result["error"] = str(e)
    return result

@app.route('/api/status')
def check_status():
    results = []


    try:
        token = get_oauth_token()
    except Exception as e:
        return jsonify({"error": f"Token error: {str(e)}"}), 500

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    for api in APIS:
        start = time.time()
        method = api.get("method", "GET").upper()
        body = api.get("body",{})
        try:
            if method == "POST":
             response = requests.post(api["url"], json=body, headers=headers, timeout=5)
            else:
             response = requests.get(api["url"], headers=headers, timeout=5)
            #response = requests.get(api["url"], timeout=3)
            response_time = int((time.time() - start) * 1000)

            if 200<=response.status_code<300:
                status ="Healthy"
                error = None
            elif 400<=response.status_code<500:
                status ="Degraded"
                error=f"Client error: {response.status_code}"
            elif response.status_code>=500:
                status="Down"
                response_time = None
                error=f"Server error: {response.status_code}"
            else:
                status="Unknown"
                error =f"Unexpected status: {response.status_code}"
            
        except Exception as e:
            status = "Down"
            response_time = None
            error = str(e)
        results.append({
            "apiName": api["name"],
            "status": status,
            "responseTime": response_time,
            "lastError": error,
			"url": api["url"]
        })
    return jsonify(results)

@app.route("/api/retry")
def retry_api():
    from flask import request, jsonify

    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Missing 'url' query parameter"}), 400

    api = next((api for api in APIS if api["url"] == url), None)
    if not api:
        return jsonify({"error": f"API not found for URL: {url}"}), 404

    try:
        token = get_oauth_token()
    except Exception as e:
        return jsonify({"error": f"Token error: {str(e)}"}), 500

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    method = api.get("method", "GET").upper()
    body = api.get("body", {"searchTerm": "Dhaka"})

    try:
        start = time.time()
        if method == "POST":
            response = requests.post(url, json=body, headers=headers, timeout=5)
        else:
            response = requests.get(url, headers=headers, timeout=5)

        response.raise_for_status()
        response_time = int((time.time() - start) * 1000)
        status = "Healthy"
        error = None

    except requests.exceptions.HTTPError as http_err:
        if 400<=http_err<500:
         status = "Degraded"
         response_time = None
         error = f"HTTP error: {http_err}"
        elif http_err>=500:
         status ="Down"
         response_time=None
         error = f"HTTP error: {http_err}"
    except Exception as e:
        status = "Down"
        response_time = None
        error = f"Error: {str(e)}"

    return jsonify({
        "apiName": api["name"],
        "status": status,
        "responseTime": response_time,
        "lastError": error,
        "url": url
    })

@app.route("/api/usage")
def get_usage():
    try:
        response = requests.get('http://localhost:8080/monitor/usage', timeout=5)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}),500
    
@app.route("/api/usage/monthly")
def get_monthly_usage():
    api_param = request.args.get("api")
    try:
        response = requests.get('http://localhost:8080/monitor/usage/monthly', timeout=5)
        response.raise_for_status()  # Raises exception for HTTP error codes
        all_usage = response.json()

        # If no specific API requested, return everything
        if not api_param:
            return jsonify(all_usage)
        
        # Extract path only (e.g. '/wikipedia')
        from urllib.parse import urlparse
        parsed_path = urlparse(api_param).path

        print("path value: "+parsed_path)
        
        # Filter and transform to group by year
        monthly = all_usage.get(parsed_path, {})

        # Transform 'YYYY-MM' -> { YYYY: { MM: count } }
        yearly_data = {}
        for ym, count in monthly.items():
            year, month = ym.split("-")
            if year not in yearly_data:
                yearly_data[year] = {}
            yearly_data[year][month] = count

        return jsonify(yearly_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    print(f"[UNHANDLED EXCEPTION] {str(e)}")
    response = jsonify({"error": str(e)})
    response.status_code = 500
    return response

	
if __name__ == '__main__':
    app.run(debug=True)